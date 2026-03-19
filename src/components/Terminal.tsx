import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { v4 as uuidv4 } from 'uuid';

interface TerminalProps {
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = () => {
  const webViewRef = useRef<WebView>(null);
  const sessionId = useRef(uuidv4());
  const wsRef = useRef<WebSocket | null>(null);
  
  // Use local IP for physical device and emulator
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.9:3000';
  const WS_URL = `${BACKEND_URL.replace('http', 'ws')}/terminal?sessionId=${sessionId.current}`;

  useEffect(() => {
    // Establish WebSocket connection from the Native side
    // This allows for better reconnection logic and stability than doing it inside WebView
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (webViewRef.current) {
          if (msg.type === 'TERMINAL_OUTPUT') {
            webViewRef.current.postMessage(JSON.stringify({ 
                type: 'OUTPUT', 
                data: msg.data 
            }));
          } else if (msg.type === 'SESSION_READY') {
            webViewRef.current.postMessage(JSON.stringify({ 
                type: 'OUTPUT', 
                data: `Connected to session: ${msg.sessionId}\r\n` 
            }));
          }
        }
      } catch (e) {
        // Fallback for raw string data
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({ 
                type: 'OUTPUT', 
                data: event.data 
            }));
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (data.type === 'INPUT') {
            wsRef.current.send(JSON.stringify({ type: 'TERMINAL_INPUT', data: data.data }));
        } else if (data.type === 'RESIZE') {
            wsRef.current.send(JSON.stringify({ type: 'TERMINAL_RESIZE', cols: data.cols, rows: data.rows }));
        }
      }
    } catch (e) {
      console.error('Error in Terminal message handler:', e);
    }
  };

  const htmlAsset = require('../../assets/editor/terminal.html');

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={htmlAsset}
        onMessage={onMessage}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    backgroundColor: '#000',
  },
});

export default Terminal;

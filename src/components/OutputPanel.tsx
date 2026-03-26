import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { X, AlertCircle, CheckCircle } from 'lucide-react-native';

interface OutputProps {
  output: string;
  error: string;
  onClose: () => void;
  isBrowserPreview?: boolean;
  previewContent?: string;
  language?: string;
  onClearTerminal?: () => void;
  mobilePath?: string;
}

import { WebView } from 'react-native-webview';
const terminalHtml = require('../../assets/editor/terminal.html');

const OutputPanel: React.FC<OutputProps> = ({ output, error, onClose, isBrowserPreview, previewContent, language, onClearTerminal, mobilePath }) => {
  const [activeTab, setActiveTab] = React.useState(isBrowserPreview ? 'PREVIEW' : 'OUTPUT');
  const termRef = React.useRef<WebView>(null);

  React.useEffect(() => {
    if (termRef.current) {
        if (output) termRef.current.postMessage(JSON.stringify({ type: 'OUTPUT', data: output + '\r\n' }));
        if (error) termRef.current.postMessage(JSON.stringify({ type: 'OUTPUT', data: '\x1b[31mError: ' + error + '\r\n\x1b[0m' }));
    }
  }, [output, error]);

  React.useEffect(() => {
    if (isBrowserPreview) setActiveTab('PREVIEW');
  }, [isBrowserPreview, previewContent]);

  const generateHtml = () => {
    if (language === 'html') return previewContent;
    return `
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="background: #1e1e1e; color: #fff; font-family: sans-serif; padding: 15px;">
          <script>
            try {
              ${previewContent}
            } catch (e) {
              document.write('<p style="color: #f44747;">' + e.message + '</p>');
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            onPress={() => setActiveTab('OUTPUT')}
            style={[styles.tab, activeTab === 'OUTPUT' && styles.activeTab]}
          >
            <Text style={activeTab === 'OUTPUT' ? styles.activeTabText : styles.tabText}>OUTPUT</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('TERMINAL')}
            style={[styles.tab, activeTab === 'TERMINAL' && styles.activeTab]}
          >
            <Text style={activeTab === 'TERMINAL' ? styles.activeTabText : styles.tabText}>TERMINAL</Text>
          </TouchableOpacity>
          {(language === 'javascript' || language === 'html' || language === 'css') && (
            <TouchableOpacity 
              onPress={() => setActiveTab('PREVIEW')}
              style={[styles.tab, activeTab === 'PREVIEW' && styles.activeTab]}
            >
              <Text style={activeTab === 'PREVIEW' ? styles.activeTabText : styles.tabText}>BROWSER PREVIEW</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={16} color="#858585" />
        </TouchableOpacity>
      </View>
      
      <View style={{ flex: 1 }}>
        {activeTab === 'PREVIEW' ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: generateHtml() || '' }}
            style={{ backgroundColor: '#1e1e1e' }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        ) : activeTab === 'TERMINAL' ? (
          <WebView
            ref={termRef}
            originWhitelist={['*']}
            source={terminalHtml}
            style={{ backgroundColor: '#000' }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoad={() => {
              const cleanPath = mobilePath ? mobilePath.replace('file://', '').replace(/%20/g, ' ') : '/Documents/projects/default/';
              const prompt = `\x1b[32mCodeMobile\x1b[0m \x1b[34m${cleanPath}\x1b[0m\r\n$ `;
              termRef.current?.postMessage(JSON.stringify({ type: 'OUTPUT', data: prompt }));
              if (output) termRef.current?.postMessage(JSON.stringify({ type: 'OUTPUT', data: output + '\r\n' }));
              if (error) termRef.current?.postMessage(JSON.stringify({ type: 'OUTPUT', data: '\x1b[31mError: ' + error + '\r\n\x1b[0m' }));
            }}
          />
        ) : (
          <ScrollView style={styles.content}>
            {output ? (
              <View style={styles.outputRow}>
                <CheckCircle size={12} color="#4EC9B0" style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.outputText}>{output}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.outputRow}>
                <AlertCircle size={12} color="#F44747" style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {!output && !error ? <Text style={styles.emptyText}>No output yet.</Text> : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: '#007ACC',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabText: {
    color: '#858585',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    padding: 10,
  },
  outputRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  outputText: {
    color: '#CCCCCC',
    fontFamily: 'monospace',
    fontSize: 12,
    flex: 1,
  },
  errorText: {
    color: '#F44747',
    fontFamily: 'monospace',
    fontSize: 12,
    flex: 1,
  },
  emptyText: {
    color: '#585858',
    fontSize: 12,
  },
});

export default OutputPanel;

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
}

import { WebView } from 'react-native-webview';

const OutputPanel: React.FC<OutputProps> = ({ output, error, onClose, isBrowserPreview, previewContent, language }) => {
  const [activeTab, setActiveTab] = React.useState(isBrowserPreview ? 'PREVIEW' : 'OUTPUT');

  React.useEffect(() => {
    if (isBrowserPreview) setActiveTab('PREVIEW');
    else setActiveTab('OUTPUT');
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

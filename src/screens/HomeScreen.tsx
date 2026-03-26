import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu, MessageSquare, Play, Save, Terminal as TerminalIcon, GitBranch, File } from 'lucide-react-native';
import { Image } from 'react-native';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import AIChat from '../components/AIChat';
import OutputPanel from '../components/OutputPanel';
import Terminal from '../components/Terminal';
import GitView from '../components/GitView';
import { useFileStore } from '../store/useFileStore';
import { executeCode } from '../utils/codeExecution';
import { getLanguageByExtension } from '../constants/languages';
import { getFileIconInfo } from '../utils/icons';

const HomeScreen = () => {
  const [showExplorer, setShowExplorer] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [executionResult, setExecutionResult] = useState({ stdout: '', stderr: '' });
  const [loading, setLoading] = useState(false);
  const { activeFile, loadFiles, saveFile, rootDir } = useFileStore();
  const [currentContent, setCurrentContent] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (activeFile) {
      setCurrentContent(activeFile.content || '');
    }
  }, [activeFile]);

  const handleSave = async () => {
    if (activeFile) {
      await saveFile(activeFile.path, currentContent);
      alert('File saved!');
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;
    
    setLoading(true);
    setShowOutput(true);
    setExecutionResult({ stdout: 'Running...', stderr: '' });

    const langMeta = getLanguageByExtension(activeFile.name);
    const langId = langMeta?.id || 'javascript';
    const result = await executeCode(langId, currentContent);
    
    setExecutionResult({
      stdout: result.run.stdout,
      stderr: result.run.stderr
    });
    setLoading(false);
  };

  const handleAiSuggestionRequest = (context: string, language: string) => {
    // Placeholder for AI suggestions
    console.log('AI Suggestion requested:', { context, language });
  };

  const currentLanguageMeta = activeFile ? getLanguageByExtension(activeFile.name) : null;
  const currentLanguage = currentLanguageMeta?.id || 'javascript';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowExplorer(!showExplorer)} style={styles.iconButton}>
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.fileHeaderInfo}>
          {activeFile && (() => {
            const info = getFileIconInfo(activeFile.name);
            if (info.uri) {
              return <Image source={{ uri: info.uri }} style={styles.headerIcon} />;
            }
            const IconComp = info.Icon || File;
            return <IconComp size={18} color={info.color} style={styles.headerIcon} />;
          })()}
          <Text style={styles.fileName}>
            {activeFile ? activeFile.name : 'CodeMobile'}
          </Text>
        </View>
 
        <View style={styles.rightActions}>
          <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
            <Save size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRun} style={[styles.iconButton, styles.runButton]}>
            <Play size={20} color="#fff" fill="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.iconButton}>
            <MessageSquare size={24} color={showChat ? "#3b82f6" : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGit(!showGit)} style={styles.iconButton}>
            <GitBranch size={24} color={showGit ? "#3b82f6" : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTerminal(!showTerminal)} style={styles.iconButton}>
            <TerminalIcon size={24} color={showTerminal ? "#3b82f6" : "#fff"} />
          </TouchableOpacity>
        </View>
      </View>
 
      <View style={styles.main}>
        {showExplorer && (
          <View style={styles.explorerOverlay}>
            <FileExplorer />
          </View>
        )}
 
        <View style={styles.editorContainer}>
          {activeFile ? (
            <Editor 
              content={activeFile.content || ''} 
              language={currentLanguage}
              onChange={setCurrentContent}
              onAiSuggestionRequest={handleAiSuggestionRequest}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Select a file to start coding</Text>
            </View>
          )}
        </View>

        {showChat && (
          <View style={styles.chatOverlay}>
            <AIChat currentCode={currentContent} />
          </View>
        )}

        {showGit && (
          <View style={styles.chatOverlay}>
            <GitView />
          </View>
        )}
      </View>

      {showTerminal && (
        <Terminal onClose={() => setShowTerminal(false)} />
      )}

      {showOutput && (
        <OutputPanel 
          output={executionResult.stdout} 
          error={executionResult.stderr} 
          onClose={() => setShowOutput(false)} 
          language={currentLanguage}
          previewContent={currentContent}
          isBrowserPreview={currentLanguage === 'html' || currentLanguage === 'javascript' || currentLanguage === 'css'}
          mobilePath={rootDir}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fileHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 2,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
    padding: 4,
  },
  runButton: {
    backgroundColor: '#22c55e',
    borderRadius: 20,
    padding: 8,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  explorerOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    zIndex: 10,
    elevation: 10,
  },
  editorContainer: {
    flex: 1,
  },
  chatOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    zIndex: 10,
    elevation: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
});

export default HomeScreen;

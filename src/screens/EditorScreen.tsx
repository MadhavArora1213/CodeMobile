import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, TouchableOpacity, Text, ScrollView, 
  Alert, TextInput, Modal, BackHandler, Clipboard,
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { Play, Save, X, Check, Keyboard as KeyboardIcon, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Editor, { EditorRef } from '../components/Editor';
import Sidebar from '../components/Sidebar';
import OutputPanel from '../components/OutputPanel';
import { useFileStore } from '../store/useFileStore';
import { executeCode } from '../utils/codeExecution';
import { askAiProxy } from '../utils/ai';
import { LANGUAGES, getLanguageByExtension } from '../constants/languages';
import { getFileIconInfo } from '../utils/icons';
import { Image as RNImage } from 'react-native';

// Menu items for each menu
const EditorScreen = () => {
  const [activePanel, setActivePanel] = useState('files');
  const [showOutput, setShowOutput] = useState(false);
  const [executionResult, setExecutionResult] = useState({ stdout: '', stderr: '' });
  const { 
    activeFile, saveFile, loadFiles, setActiveFile, 
    createFile, createFolder, createTextFile, 
    autoSave, toggleAutoSave, saveAllFiles,
    openExternalFile, closeFolder
  } = useFileStore();
  const [currentContent, setCurrentContent] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<EditorRef>(null);
  const [wordWrap, setWordWrap] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (activeFile) {
      setCurrentContent(activeFile.content || '');
    }
  }, [activeFile]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && activeFile && currentContent !== activeFile.content) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveFile(activeFile.path, currentContent);
      }, 1000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [currentContent, autoSave]);

  const handleSave = async () => {
    if (activeFile) {
      await saveFile(activeFile.path, currentContent);
      Alert.alert('✓ Saved', `${activeFile.name} saved successfully`);
    } else {
      Alert.alert('No File', 'No file is open to save');
    }
  };

  const handleAiSuggestion = async (context: string, language: string) => {
    try {
      const prompt = `COMPLETE_CODE:\nFile: ${activeFile?.name || 'file.' + language}\nContext:\n${context}`;
      const suggestion = await askAiProxy(prompt, context);
      // Clean up suggestion to be just code fragment
      const cleaned = suggestion.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      editorRef.current?.sendData({ type: 'AI_SUGGESTION_RESULT', suggestion: cleaned });
    } catch (e) {
      console.error('AI Suggestion Failure:', e);
    }
  };

  const getLanguage = (filename: string) => {
    const langMeta = getLanguageByExtension(filename);
    if (langMeta) return langMeta.id;
    
    // Fallbacks for non-runnable languages
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'json') return 'javascript';
    if (ext === 'md') return 'markdown';
    return 'text';
  };

  const handleRun = async () => {
    if (!activeFile) return;
    setShowOutput(true);
    setExecutionResult({ stdout: 'Running...', stderr: '' });
    const lang = getLanguage(activeFile.name);
    // Remove .extension from name for Piston call if necessary, 
    // but executeCode handles it with meta.
    const baseName = activeFile.name.split('.')[0] || 'main';
    const result = await executeCode(lang, currentContent, baseName);
    setExecutionResult({ 
      stdout: result.run.stdout || (result.run.code === 0 ? '✓ Execution finished (no output)' : ''), 
      stderr: result.run.stderr 
    });
  };

  const handleOpenFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await openExternalFile(asset.uri, asset.name);
      }
    } catch (e) {
      console.error('Error picking document:', e);
    }
  };

  const handleOpenFolder = async () => {
    setActivePanel('files');
  };

  const handleNewFile = () => {
    setShowNewFileModal(true);
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const confirmNewFile = () => {
    if (newFileName.trim()) {
      createFile(newFileName.trim());
      setNewFileName('');
      setShowNewFileModal(false);
    }
  };

  const confirmNewFolder = () => {
    if (newFileName.trim()) {
      createFolder(newFileName.trim());
      setNewFileName('');
      setShowNewFolderModal(false);
    }
  };

  const handleMenuAction = (action: string) => {
    setOpenMenu(null);
    switch (action) {
      // File menu
      case 'newTextFile': createTextFile(); break;
      case 'newFile': handleNewFile(); break;
      case 'openFile': 
        setActivePanel('files');
        handleOpenFile(); 
        break;
      case 'openFolder': handleOpenFolder(); break;
      case 'save': handleSave(); break;
      case 'saveAll': 
        saveAllFiles(); 
        Alert.alert('✓ Saved', 'All files saved');
        break;
      case 'autoSave': toggleAutoSave(); break;
      case 'closeFile': setActiveFile(null); break;
      case 'closeFolder': 
        Alert.alert('Close Folder', 'Are you sure you want to close the folder?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close', onPress: () => closeFolder() },
        ]);
        break;
      case 'exit': 
        Alert.alert('Exit', 'Do you want to exit?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', onPress: () => BackHandler.exitApp() },
        ]);
        break;
      // Edit menu commands - sent to WebView
      case 'undo': editorRef.current?.sendCommand('undo'); break;
      case 'redo': editorRef.current?.sendCommand('redo'); break;
      case 'cut': editorRef.current?.sendCommand('cut'); break;
      case 'copy': editorRef.current?.sendCommand('copy'); break;
      case 'paste':
        Clipboard.getString().then((text: string) => {
          if (editorRef.current) {
            editorRef.current.sendData({ type: 'PASTE', text: text });
          }
        }).catch(() => {});
        break;
      case 'find': editorRef.current?.sendCommand('find'); break;
      case 'replace': editorRef.current?.sendCommand('replace'); break;
      case 'findInFiles': setActivePanel('search'); break;
      case 'wordWrap':
        setWordWrap(!wordWrap);
        editorRef.current?.sendCommand(wordWrap ? 'wordWrapOff' : 'wordWrapOn');
        break;
      case 'showProblems': setShowProblems(!showProblems); break;
      case 'showOutput': setShowOutput(true); break;
      case 'showTerminal': break; // Navigated via tab bar
      case 'replaceInFiles': setActivePanel('search'); break;
      case 'selectAll': editorRef.current?.sendCommand('selectAll'); break;
      case 'selectLine': editorRef.current?.sendCommand('selectLine'); break;
      // Terminal menu
      case 'newTerminal': break; // Handled by bottom tab normally
      case 'splitTerminal': Alert.alert('Terminal', 'Split terminal functionality coming soon'); break;
      case 'newTerminalWindow': break;
      case 'runTask': Alert.alert('Tasks', 'Task runner coming soon'); break;
      case 'runBuildTask': Alert.alert('Tasks', 'Build task runner coming soon'); break;
      case 'runActiveFile': handleRun(); break;
      case 'runSelectedText': handleRun(); break;
      case 'showTasks': break;
      case 'restartTask': break;
      case 'terminateTask': break;
      case 'configureTasks': break;
      case 'configureBuildTask': break;
      // Run menu
      case 'run': case 'runOutput': handleRun(); break;
      // View menu
      case 'showExplorer': setActivePanel('files'); break;
      case 'showSearch': setActivePanel('search'); break;
      case 'showGit': setActivePanel('git'); break;
      case 'showAI': setActivePanel('ai'); break;
      case 'toggleOutput': setShowOutput(!showOutput); break;
      case 'about':
        Alert.alert('CodeMobile', 'A mobile code editor built with React Native.\nVersion 1.0.0\n\n© 2026 CodeMobile');
        break;
      case 'divider': break;
      default: break;
    }
  };

  // Build menu data dynamically for auto-save checkmark
  const menuData: { [key: string]: { label: string; action: string; shortcut?: string; checked?: boolean }[] } = {
    'File': [
      { label: 'New Text File', action: 'newTextFile', shortcut: 'Ctrl+N' },
      { label: 'New File...', action: 'newFile', shortcut: 'Ctrl+Alt+N' },
      { label: '─────────', action: 'divider' },
      { label: 'Open File...', action: 'openFile', shortcut: 'Ctrl+O' },
      { label: 'Open Folder...', action: 'openFolder', shortcut: 'Ctrl+K' },
      { label: '─────────', action: 'divider' },
      { label: 'Save', action: 'save', shortcut: 'Ctrl+S' },
      { label: 'Save All', action: 'saveAll', shortcut: 'Ctrl+K S' },
      { label: '─────────', action: 'divider' },
      { label: 'Auto Save', action: 'autoSave', checked: autoSave },
      { label: '─────────', action: 'divider' },
      { label: 'Close Editor', action: 'closeFile', shortcut: 'Ctrl+F4' },
      { label: 'Close Folder', action: 'closeFolder', shortcut: 'Ctrl+K F' },
      { label: '─────────', action: 'divider' },
      { label: 'Exit', action: 'exit', shortcut: 'Alt+F4' },
    ],
    'Edit': [
      { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Y' },
      { label: '─────────', action: 'divider' },
      { label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
      { label: '─────────', action: 'divider' },
      { label: 'Find', action: 'find', shortcut: 'Ctrl+F' },
      { label: 'Replace', action: 'replace', shortcut: 'Ctrl+H' },
      { label: '─────────', action: 'divider' },
      { label: 'Format Document', action: 'format', shortcut: 'Shift+Alt+F' },
      { label: '─────────', action: 'divider' },
      { label: 'Find in Files', action: 'findInFiles', shortcut: 'Ctrl+Shift+F' },
      { label: 'Replace in Files', action: 'replaceInFiles', shortcut: 'Ctrl+Shift+H' },
    ],

    'View': [
      { label: 'Explorer', action: 'showExplorer', shortcut: 'Ctrl+Shift+E' },
      { label: 'Search', action: 'showSearch', shortcut: 'Ctrl+Shift+F' },
      { label: 'Source Control', action: 'showGit', shortcut: 'Ctrl+Shift+G' },
      { label: 'Run', action: 'showRun', shortcut: 'Ctrl+Shift+D' },
      { label: '─────────', action: 'divider' },
      { label: 'Problems', action: 'showProblems', shortcut: 'Ctrl+Shift+M' },
      { label: 'Output', action: 'showOutput', shortcut: 'Ctrl+Shift+U' },
      { label: 'Terminal', action: 'showTerminal', shortcut: 'Ctrl+`' },
      { label: '─────────', action: 'divider' },
      { label: 'Word Wrap', action: 'wordWrap', shortcut: 'Alt+Z', checked: wordWrap },
    ],
    'Terminal': [
      { label: 'New Terminal', action: 'newTerminal', shortcut: 'Ctrl+Shift+`' },
      { label: 'Split Terminal', action: 'splitTerminal', shortcut: 'Ctrl+Shift+5' },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Menu Bar */}
      <View style={styles.menuBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuItems}>
          {Object.keys(menuData).map(menu => (
            <TouchableOpacity
              key={menu}
              style={[styles.menuItem, openMenu === menu && styles.menuItemActive]}
              onPress={() => setOpenMenu(openMenu === menu ? null : menu)}
            >
              <Text style={[styles.menuText, openMenu === menu && styles.menuTextActive]}>{menu}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Auto-save indicator */}
        {autoSave && (
          <View style={styles.autoSaveIndicator}>
            <Text style={styles.autoSaveText}>AUTO</Text>
          </View>
        )}
      </View>

      {/* Dropdown Menu */}
      {openMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setOpenMenu(null)}
        >
          <View style={styles.menuDropdown}>
            {menuData[openMenu].map((item, idx) => (
              item.action === 'divider' ? (
                <View key={idx} style={styles.menuDivider} />
              ) : (
                <TouchableOpacity
                  key={idx}
                  style={styles.menuDropdownItem}
                  onPress={() => handleMenuAction(item.action)}
                >
                  <View style={styles.menuItemLeft}>
                    {item.checked !== undefined && (
                      <View style={styles.checkBox}>
                        {item.checked && <Check size={12} color="#CCCCCC" />}
                      </View>
                    )}
                    <Text style={styles.menuDropdownText}>{item.label}</Text>
                  </View>
                  {item.shortcut && (
                    <Text style={styles.menuShortcut}>{item.shortcut}</Text>
                  )}
                </TouchableOpacity>
              )
            ))}
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.main}>
        {/* VS Code Sidebar */}
        <Sidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          onFileSelect={() => setActivePanel('')}
        />

        {/* Editor Area */}
        <View style={styles.editorArea}>
          {/* Tab Bar */}
          {activeFile && (
            <View style={styles.tabBar}>
              <View style={styles.tab}>
                {(() => {
                  const info = getFileIconInfo(activeFile.name);
                  if (info.uri) {
                    return <RNImage source={{ uri: info.uri }} style={{ width: 14, height: 14, marginRight: 6 }} />;
                  }
                  const IconComp = info.Icon;
                  return <IconComp size={14} color={info.color} style={{ marginRight: 6 }} />;
                })()}
                <Text style={styles.tabText}>{activeFile.name}</Text>
                <TouchableOpacity onPress={() => setActiveFile(null)} style={styles.tabClose}>
                  <X size={14} color="#858585" />
                </TouchableOpacity>
              </View>
              <View style={styles.tabActions}>
                <TouchableOpacity onPress={() => editorRef.current?.sendCommand('focus')} style={styles.tabBtn}>
                  <KeyboardIcon size={16} color="#858585" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  handleAiSuggestion(currentContent, getLanguage(activeFile?.name || ''));
                }} style={styles.tabBtn}>
                  <Sparkles size={18} color="#C5C5C5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.tabBtn}>
                  <Save size={18} color="#C5C5C5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRun} style={styles.runButton}>
                  <Play size={16} color="#fff" fill="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Editor Content */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editorContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
          >
                {activeFile ? (
                  <Editor
                    ref={editorRef}
                    content={activeFile.content || ''}
                    language={getLanguage(activeFile.name)}
                    onChange={setCurrentContent}
                    onAiSuggestionRequest={handleAiSuggestion}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Welcome to CodeMobile</Text>
                    <Text style={styles.emptyText}>Start coding on the go with a full-featured IDE</Text>
                    
                    <View style={styles.emptyActions}>
                      <TouchableOpacity 
                        style={styles.bigOpenBtn} 
                        onPress={() => setActivePanel('files')}
                      >
                        <Text style={styles.bigOpenBtnText}>Open File Explorer</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.bigOpenBtnSecondary} 
                        onPress={handleNewFile}
                      >
                        <Text style={styles.bigOpenBtnTextSecondary}>New File</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Output Panel */}
      {showOutput && (
        <OutputPanel
          output={executionResult.stdout}
          error={executionResult.stderr}
          onClose={() => setShowOutput(false)}
          language={getLanguage(activeFile?.name || '')}
          previewContent={currentContent}
          isBrowserPreview={['javascript', 'html', 'css', 'typescript'].includes(getLanguage(activeFile?.name || ''))}
        />
      )}

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>main</Text>
          {autoSave && <Text style={styles.statusText}> • Auto Save ON</Text>}
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>
            {activeFile ? getLanguage(activeFile.name).toUpperCase() : 'PLAIN TEXT'}
          </Text>
          <Text style={styles.statusText}>UTF-8</Text>
          <Text style={styles.statusText}>LF</Text>
        </View>
      </View>

      {/* New File Modal */}
      <Modal visible={showNewFileModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNewFileModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New File</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter filename (e.g. app.js)"
              placeholderTextColor="#585858"
              value={newFileName}
              onChangeText={setNewFileName}
              onSubmitEditing={confirmNewFile}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowNewFileModal(false)} style={styles.modalBtnCancel}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmNewFile} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* New Folder Modal */}
      <Modal visible={showNewFolderModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNewFolderModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter folder name"
              placeholderTextColor="#585858"
              value={newFileName}
              onChangeText={setNewFileName}
              onSubmitEditing={confirmNewFolder}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowNewFolderModal(false)} style={styles.modalBtnCancel}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmNewFolder} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  // Top Menu Bar
  menuBar: {
    height: 30,
    backgroundColor: '#3C3C3C',
    borderBottomWidth: 1,
    borderBottomColor: '#252526',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItems: {
    alignItems: 'center',
    paddingHorizontal: 4,
    flex: 1,
  },
  menuItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  menuItemActive: {
    backgroundColor: '#505050',
  },
  menuText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  menuTextActive: {
    color: '#fff',
  },
  autoSaveIndicator: {
    backgroundColor: '#007ACC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
  },
  autoSaveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  // Dropdown
  menuOverlay: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  menuDropdown: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#454545',
    borderRadius: 6,
    marginLeft: 4,
    width: 240,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  menuDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 16,
    height: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdownText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  menuShortcut: {
    color: '#858585',
    fontSize: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#454545',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  // Main
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  editorArea: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  // Tab Bar
  tabBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  tab: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#007ACC',
  },
  tabText: {
    color: '#fff',
    fontSize: 13,
    marginRight: 8,
  },
  tabClose: {
    padding: 2,
  },
  tabActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  tabBtn: {
    padding: 6,
    marginLeft: 4,
  },
  runButton: {
    marginLeft: 4,
    backgroundColor: '#22c55e',
    borderRadius: 14,
    padding: 6,
  },
  editorContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 20,
  },
  emptyTitle: {
    color: '#CCCCCC',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    color: '#858585',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 200,
    gap: 10,
  },
  bigOpenBtn: {
    backgroundColor: '#007ACC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  bigOpenBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bigOpenBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#454545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  bigOpenBtnTextSecondary: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  // Status Bar
  statusBar: {
    height: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007ACC',
    paddingHorizontal: 10,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#252526',
    borderRadius: 8,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: '#454545',
  },
  modalTitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#3C3C3C',
    borderRadius: 4,
    padding: 10,
    color: '#CCCCCC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#555',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalBtn: {
    backgroundColor: '#0E639C',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  modalBtnCancel: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  modalBtnCancelText: {
    color: '#858585',
    fontSize: 13,
  },
});

export default EditorScreen;

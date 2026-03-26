import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, Image } from 'react-native';
import { 
  File, Folder, FolderOpen, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, RefreshCw, Trash2, Search, 
  GitBranch, MessageSquare, X,
  FileCode, FileJson, FileText, Hash, Globe, 
  Database, Terminal, Image as LucideImage, Settings, Braces,
  Package, Layout, Shield, Wrench, Bot,
  FileVideo, FileAudio, FileArchive, Sheet, FileType,
  Atom, Link, FolderCode
} from 'lucide-react-native';
import { useFileStore } from '../store/useFileStore';

import { getFileIconInfo, getFolderIconInfo } from '../utils/icons';

interface SidebarProps {
  onFileSelect?: () => void;
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

const getFileColor = (name: string) => getFileIconInfo(name).color;

const FileTreeItem = ({ 
  item, onSelect, onDelete, 
  isMultiSelect, selectedPaths, onToggleSelect 
}: { 
  item: any; onSelect: (item: any) => void; onDelete: (path: string) => void;
  isMultiSelect: boolean; selectedPaths: string[]; onToggleSelect: (path: string) => void;
}) => {
  const { activeFile, selectedFolder, toggleFolder, setSelectedFolder } = useFileStore();
  const isActive = activeFile?.path === item.path;
  const isSelected = selectedFolder === item.path;
  const isSelectedForBulk = selectedPaths.includes(item.path);
  const paddingLeft = 12 + (item.depth || 0) * 16;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.fileItem, 
          isActive && styles.activeFileItem, 
          { paddingLeft }
        ]}
        onPress={() => {
          if (isMultiSelect) {
            onToggleSelect(item.path);
          } else if (item.isDirectory) {
            toggleFolder(item.path);
            setSelectedFolder(item.path);
          } else {
            onSelect(item);
            const parentDir = item.path.substring(0, item.path.lastIndexOf('/') + 1);
            setSelectedFolder(parentDir);
          }
        }}
        onLongPress={() => {
          if (!isMultiSelect) {
            Alert.alert('Delete', `Delete "${item.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.path) },
            ]);
          }
        }}
      >
        {isMultiSelect && (
          <View style={{ marginRight: 8 }}>
            <View style={{ 
              width: 16, height: 16, borderRadius: 2, borderWidth: 1, 
              borderColor: isSelectedForBulk ? '#3b82f6' : '#858585',
              backgroundColor: isSelectedForBulk ? '#3b82f6' : 'transparent',
              justifyContent: 'center', alignItems: 'center'
            }}>
              {isSelectedForBulk && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
            </View>
          </View>
        )}
        {item.isDirectory ? (
          item.isOpen ? (
            <ChevronDown size={14} color="#858585" style={{ marginRight: 2 }} />
          ) : (
            <ChevronRight size={14} color="#858585" style={{ marginRight: 2 }} />
          )
        ) : (
          <View style={{ width: 16, marginRight: 2 }} />
        )}
        {(() => {
          const info = item.isDirectory 
            ? getFolderIconInfo(item.name, item.isOpen) 
            : getFileIconInfo(item.name);
          
          if (info.uri) {
            return <Image source={{ uri: info.uri }} style={[styles.icon, { width: 16, height: 16 }]} />;
          }
          const ItemIcon = info.Icon;
          return <ItemIcon size={16} color={info.color} style={styles.icon} />;
        })()}
        <Text style={[styles.fileName, isActive && styles.activeFileName]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flex: 1 }} />
        {item.isDirty ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 12 }} />
        ) : item.isDirectory ? (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7ED321', marginRight: 8, opacity: 0.8 }} />
        ) : null}
      </TouchableOpacity>
      {item.isDirectory && item.isOpen && item.children && (
        item.children.map((child: any) => (
          <FileTreeItem 
            key={child.path} 
            item={child} 
            onSelect={onSelect} 
            onDelete={onDelete}
            isMultiSelect={isMultiSelect}
            selectedPaths={selectedPaths}
            onToggleSelect={onToggleSelect}
          />
        ))
      )}
    </View>
  );
};

// Code Search panel (VS Code style)
const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<{ file: string; line: number; text: string; path: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const { files, setActiveFile } = useFileStore();

  const flattenFiles = (nodes: any[]): any[] => {
    let result: any[] = [];
    nodes.forEach(node => {
      if (!node.isDirectory) result.push(node);
      if (node.children) result = result.concat(flattenFiles(node.children));
    });
    return result;
  };

  const doSearch = async () => {
    if (!searchQuery.trim()) { setResults([]); return; }
    setSearching(true);
    const allFiles = flattenFiles(files);
    const found: { file: string; line: number; text: string; path: string }[] = [];

    for (const f of allFiles) {
      try {
        const FileSystem = require('expo-file-system/legacy');
        const content = await FileSystem.readAsStringAsync(f.path);
        const lines = content.split('\n');
        lines.forEach((lineText: string, idx: number) => {
          const match = caseSensitive
            ? lineText.includes(searchQuery)
            : lineText.toLowerCase().includes(searchQuery.toLowerCase());
          if (match) {
            found.push({ file: f.name, line: idx + 1, text: lineText.trim(), path: f.path });
          }
        });
      } catch (e) { /* skip unreadable files */ }
    }
    setResults(found);
    setSearching(false);
  };

  return (
    <View style={styles.panelContent}>
      {/* Header */}
      <View style={styles.searchHeader}>
        <Text style={styles.panelTitle}>CODE SEARCH</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchFieldRow}>
        <TouchableOpacity onPress={() => setShowReplace(!showReplace)} style={styles.expandBtn}>
          {showReplace ? (
            <ChevronDown size={14} color="#858585" />
          ) : (
            <ChevronRight size={14} color="#858585" />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#858585"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={doSearch}
            />
            <TouchableOpacity
              onPress={() => setCaseSensitive(!caseSensitive)}
              style={[styles.toggleBtn, caseSensitive && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, caseSensitive && styles.toggleTextActive]}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setUseRegex(!useRegex)}
              style={[styles.toggleBtn, useRegex && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, useRegex && styles.toggleTextActive]}>.*</Text>
            </TouchableOpacity>
          </View>

          {/* Replace Input */}
          {showReplace && (
            <View style={[styles.searchBox, { marginTop: 4 }]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Replace"
                placeholderTextColor="#858585"
                value={replaceQuery}
                onChangeText={setReplaceQuery}
              />
              <TouchableOpacity style={styles.toggleBtn}>
                <Text style={styles.toggleText}>AB</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView style={{ flex: 1, marginTop: 4 }}>
        {searching && <Text style={styles.searchInfo}>Searching...</Text>}
        {!searching && results.length > 0 && (
          <Text style={styles.searchInfo}>{results.length} result{results.length !== 1 ? 's' : ''} found</Text>
        )}
        {results.map((r, i) => (
          <View key={`${r.path}-${r.line}-${i}`}>
            {(i === 0 || results[i - 1].path !== r.path) && (
              <View style={styles.resultFileHeader}>
                {(() => {
                  const info = getFileIconInfo(r.file);
                  if (info.uri) {
                    return <Image source={{ uri: info.uri }} style={{ width: 14, height: 14, marginRight: 6 }} />;
                  }
                  const FileIcon = info.Icon;
                  return <FileIcon size={14} color={info.color} style={{ marginRight: 6 }} />;
                })()}
                <Text style={styles.resultFileName}>{r.file}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.resultLine}
              onPress={() => {
                const ext = r.file.split('.').pop()?.toLowerCase() || 'text';
                setActiveFile({ 
                  id: r.path, 
                  name: r.file, 
                  path: r.path, 
                  type: 'file',
                  isDirectory: false, 
                  language: ext,
                  depth: 0
                });
              }}
            >
              <Text style={styles.resultLineNum}>{r.line}</Text>
              <Text style={styles.resultLineText} numberOfLines={1}>{r.text}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// Git panel
const GitPanel = () => (
  <View style={styles.panelContent}>
    <Text style={styles.panelTitle}>SOURCE CONTROL</Text>
    <View style={styles.emptyPanel}>
      <GitBranch size={40} color="#858585" />
      <Text style={styles.emptyText}>No Git repository</Text>
      <TouchableOpacity style={styles.initButton}>
        <Text style={styles.initButtonText}>Initialize Repository</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// AI panel
const AIPanel = () => (
  <View style={styles.panelContent}>
    <Text style={styles.panelTitle}>AI ASSISTANT</Text>
    <View style={styles.emptyPanel}>
      <MessageSquare size={40} color="#858585" />
      <Text style={styles.emptyText}>Ask AI about your code</Text>
      <Text style={styles.emptySubText}>Use the AI tab for full chat</Text>
    </View>
  </View>
);

const Sidebar = ({ onFileSelect, activePanel, onPanelChange }: SidebarProps) => {
  const { 
    files, setActiveFile, loadFiles, createFile, 
    createFolder, deleteItem, deleteItems, selectedFolder, 
    setSelectedFolder, rootDir, externalRootUri 
  } = useFileStore();
  const [showNewInput, setShowNewInput] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  
  const toggleSelection = (path: string) => {
    setSelectedPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleBulkDelete = () => {
    if (selectedPaths.length === 0) return;
    Alert.alert(
      'Bulk Delete', 
      `Are you sure you want to delete ${selectedPaths.length} items?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteItems(selectedPaths);
            setSelectedPaths([]);
            setIsMultiSelect(false);
          } 
        },
      ]
    );
  };

  const handleSelect = (item: any) => {
    setActiveFile(item);
    if (onFileSelect) onFileSelect();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (showNewInput === 'file') {
      createFile(newName.trim());
    } else if (showNewInput === 'folder') {
      createFolder(newName.trim());
    }
    setNewName('');
    setShowNewInput(null);
  };

  return (
    <View style={styles.sidebarContainer}>
      {/* Activity Bar - VS Code style icon strip */}
      <View style={styles.activityBar}>
        <TouchableOpacity
          style={[styles.activityIcon, activePanel === 'files' && styles.activityIconActive]}
          onPress={() => onPanelChange(activePanel === 'files' ? '' : 'files')}
        >
          <File size={22} color={activePanel === 'files' ? '#fff' : '#858585'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.activityIcon, activePanel === 'search' && styles.activityIconActive]}
          onPress={() => onPanelChange(activePanel === 'search' ? '' : 'search')}
        >
          <Search size={22} color={activePanel === 'search' ? '#fff' : '#858585'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.activityIcon, activePanel === 'git' && styles.activityIconActive]}
          onPress={() => onPanelChange(activePanel === 'git' ? '' : 'git')}
        >
          <GitBranch size={22} color={activePanel === 'git' ? '#fff' : '#858585'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.activityIcon, activePanel === 'ai' && styles.activityIconActive]}
          onPress={() => onPanelChange(activePanel === 'ai' ? '' : 'ai')}
        >
          <Bot size={22} color={activePanel === 'ai' ? '#fff' : '#858585'} />
        </TouchableOpacity>
      </View>

      {/* Side Panel Content */}
      {activePanel !== '' && (
        <View style={styles.sidePanel}>
          {activePanel === 'files' && (
            <View style={{ flex: 1 }}>
              {/* Explorer Header with action buttons */}
              <View style={styles.explorerHeader}>
                <View style={styles.headerTitleContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.panelTitle}>EXPLORER</Text>
                    {externalRootUri && (
                      <View style={{ backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#7ED321', paddingHorizontal: 5, borderRadius: 10, marginLeft: 8 }}>
                        <Text style={{ color: '#7ED321', fontSize: 9, fontWeight: 'bold' }}>✓ SYNC</Text>
                      </View>
                    )}
                  </View>
                  {externalRootUri ? (
                    <Text style={styles.targetInfo} numberOfLines={1} ellipsizeMode="tail">
                      Project: {(() => {
                        const decoded = decodeURIComponent(externalRootUri);
                        const normalized = decoded.endsWith('/') ? decoded.slice(0, -1) : decoded;
                        return normalized.split('/').pop() || normalized.split(':').pop() || 'Phone Storage';
                      })()}
                    </Text>
                  ) : null}
                  <Text style={[styles.targetInfo, { marginTop: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                    {(selectedFolder && selectedFolder !== rootDir) 
                      ? `Target: ${selectedFolder.split('/').filter(Boolean).pop()}` 
                      : 'Target: Root'
                    }
                  </Text>
                </View>
                <View style={styles.explorerActions}>
                  <TouchableOpacity onPress={() => setShowNewInput('file')} style={styles.actionBtn}>
                    <FilePlus size={16} color="#C5C5C5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowNewInput('folder')} style={styles.actionBtn}>
                    <FolderPlus size={16} color="#C5C5C5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={loadFiles} style={styles.actionBtn}>
                    <RefreshCw size={16} color="#C5C5C5" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setIsMultiSelect(!isMultiSelect);
                      setSelectedPaths([]);
                    }} 
                    style={[styles.actionBtn, isMultiSelect && { backgroundColor: '#3b82f6' }]}
                  >
                    <Settings size={16} color={isMultiSelect ? "#fff" : "#C5C5C5"} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Multi-Select Toolbar if active */}
              {isMultiSelect && (
                <View style={{ 
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#252526',
                  borderBottomWidth: 1, borderBottomColor: '#333'
                }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{selectedPaths.length} Selected</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => setSelectedPaths([])} style={{ marginRight: 16 }}>
                      <Text style={{ color: '#3b82f6', fontSize: 12 }}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleBulkDelete} disabled={selectedPaths.length === 0}>
                      <Trash2 size={16} color={selectedPaths.length > 0 ? "#ff4d4d" : "#555"} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* New File/Folder Input */}
              {showNewInput && (
                <View style={styles.newInputRow}>
                  {(() => {
                    const info = showNewInput === 'folder' 
                      ? getFolderIconInfo(newName, false) 
                      : getFileIconInfo(newName);
                    
                    if (info.uri) {
                      return <Image source={{ uri: info.uri }} style={{ width: 14, height: 14, marginRight: 6 }} />;
                    }
                    const TargetIcon = info.Icon || File;
                    return <TargetIcon size={14} color={info.color} style={{ marginRight: 6 }} />;
                  })()}
                  <TextInput
                    style={styles.newInput}
                    placeholder={showNewInput === 'file' ? 'filename.js' : 'folder-name'}
                    placeholderTextColor="#858585"
                    value={newName}
                    onChangeText={setNewName}
                    onSubmitEditing={handleCreate}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowNewInput(null)}>
                    <X size={14} color="#858585" />
                  </TouchableOpacity>
                </View>
              )}

              {/* File Tree */}
              <ScrollView style={{ flex: 1 }}>
                <TouchableOpacity 
                  activeOpacity={1} 
                  style={{ flex: 1, minHeight: 400 }} 
                  onPress={() => setSelectedFolder(rootDir)}
                >
                  {files.map(item => (
                    <FileTreeItem
                      key={item.path}
                      item={item}
                      onSelect={handleSelect}
                      onDelete={deleteItem}
                      isMultiSelect={isMultiSelect}
                      selectedPaths={selectedPaths}
                      onToggleSelect={toggleSelection}
                    />
                  ))}
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {activePanel === 'search' && <SearchPanel />}
          {activePanel === 'git' && <GitPanel />}
          {activePanel === 'ai' && <AIPanel />}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  // Activity Bar (thin icon strip)
  activityBar: {
    width: 48,
    backgroundColor: '#252526',
    alignItems: 'center',
    paddingTop: 4,
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  activityIcon: {
    width: 48, height: 48,
    justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: 2, borderLeftColor: 'transparent',
  },
  activityIconActive: {
    borderLeftColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // Side Panel
  sidePanel: {
    width: 220,
    backgroundColor: '#252526',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  panelContent: {
    flex: 1,
  },
  panelTitle: {
    color: '#BBBBBB',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Explorer Header
  explorerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  explorerActions: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  actionBtn: {
    padding: 4,
    marginLeft: 4,
  },
  // New file/folder input
  newInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#37373D',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  newInput: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 13,
    padding: 2,
  },
  // File tree
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  activeFileItem: {
    backgroundColor: '#37373D',
  },
  selectedFolderItem: {
    backgroundColor: 'rgba(0, 122, 204, 0.2)',
    borderLeftWidth: 2,
    borderLeftColor: '#007ACC',
  },
  targetInfo: {
    color: '#858585',
    fontSize: 10,
    marginTop: 2,
  },
  icon: {
    marginRight: 6,
  },
  fileName: {
    color: '#CCCCCC',
    fontSize: 13,
    flex: 1,
  },
  activeFileName: {
    color: '#fff',
  },
  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3C3C3C',
    margin: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  searchInput: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 13,
    padding: 6,
    marginLeft: 4,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchResultText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  // Empty panels
  emptyPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#858585',
    fontSize: 13,
    marginTop: 12,
  },
  emptySubText: {
    color: '#585858',
    fontSize: 11,
    marginTop: 4,
  },
  initButton: {
    marginTop: 16,
    backgroundColor: '#0E639C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  // Code Search styles
  searchHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchFieldRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  expandBtn: {
    paddingTop: 6,
    paddingRight: 4,
  },
  toggleBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 2,
    borderRadius: 2,
  },
  toggleBtnActive: {
    backgroundColor: '#007ACC',
  },
  toggleText: {
    color: '#858585',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  searchInfo: {
    color: '#858585',
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  resultFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2D2D2D',
  },
  resultFileName: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  resultLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  resultLineNum: {
    color: '#858585',
    fontSize: 12,
    width: 30,
    textAlign: 'right',
    marginRight: 8,
  },
  resultLineText: {
    color: '#CCCCCC',
    fontSize: 12,
    flex: 1,
  },
});

export default Sidebar;

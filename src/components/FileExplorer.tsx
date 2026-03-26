import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { File, Folder, Plus, FilePlus, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react-native';
import { useFileStore } from '../store/useFileStore';
import * as DocumentPicker from 'expo-document-picker';
import { getFileIconInfo } from '../utils/icons';

const FileTreeItem = ({ item, onSelect }: { item: any; onSelect?: () => void }) => {
  const { activeFile, toggleFolder, setSelectedFolder } = useFileStore();
  const isActive = activeFile?.path === item.path;
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
          if (item.isDirectory) {
            toggleFolder(item.path);
            setSelectedFolder(item.path);
          } else {
            const { setActiveFile } = useFileStore.getState();
            setActiveFile(item);
            if (onSelect) onSelect();
          }
        }}
      >
        {item.isDirectory ? (
          item.isOpen ? (
            <ChevronDown size={14} color="#858585" style={{ marginRight: 4 }} />
          ) : (
            <ChevronRight size={14} color="#858585" style={{ marginRight: 4 }} />
          )
        ) : (
          <View style={{ width: 14, marginRight: 4 }} />
        )}
        
        {(() => {
          const info = getFileIconInfo(item.name);
          const IconComp = item.isDirectory ? Folder : (info.Icon || File);
          return <IconComp size={18} color={item.isDirectory ? "#3b82f6" : (info.color || "#94a3b8")} style={styles.icon} />;
        })()}
        
        <Text style={[styles.fileName, isActive && styles.activeFileName]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
      
      {item.isDirectory && item.isOpen && item.children && (
        item.children.map((child: any) => (
          <FileTreeItem key={child.path} item={child} onSelect={onSelect} />
        ))
      )}
    </View>
  );
};

const FileExplorer = ({ onFileSelect }: { onFileSelect?: () => void }) => {
  const { files, importFiles, importFile } = useFileStore();

  const handleOpenFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await importFile(asset.uri, asset.name);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'vnd.android.document/directory',
        copyToCacheDirectory: true,
        multiple: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await importFiles(result.assets.map(a => ({ uri: a.uri, name: a.name })));
      }
    } catch (error) {
      try {
        const fallbackResult = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          multiple: true
        });
        if (!fallbackResult.canceled && fallbackResult.assets) {
          await importFiles(fallbackResult.assets.map(a => ({ uri: a.uri, name: a.name })));
        }
      } catch (e) {
        console.error('Error picking folder:', e);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
        <View style={styles.headerActions}>
           <TouchableOpacity onPress={handleOpenFile} style={styles.headerIconBtn}>
            <FilePlus size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenFolder} style={styles.headerIconBtn}>
            <FolderPlus size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {files.map(file => (
          <FileTreeItem key={file.path} item={file} onSelect={onFileSelect} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    padding: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  activeFileItem: {
    backgroundColor: '#1e293b',
  },
  icon: {
    marginRight: 10,
  },
  fileName: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  activeFileName: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default FileExplorer;

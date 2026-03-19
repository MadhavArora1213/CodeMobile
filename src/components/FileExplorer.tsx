import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { File, Folder, Plus, Trash2 } from 'lucide-react-native';
import { useFileStore } from '../store/useFileStore';

const FileExplorer = ({ onFileSelect }: { onFileSelect?: () => void }) => {
  const { files, setActiveFile, activeFile } = useFileStore();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        activeFile?.path === item.path && styles.activeFileItem
      ]}
      onPress={() => {
        setActiveFile(item);
        if (onFileSelect) onFileSelect();
      }}
    >
      {item.isDirectory ? (
        <Folder size={20} color="#3b82f6" style={styles.icon} />
      ) : (
        <File size={20} color="#94a3b8" style={styles.icon} />
      )}
      <Text style={styles.fileName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Files</Text>
        <TouchableOpacity>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={files}
        renderItem={renderItem}
        keyExtractor={(item) => item.path}
        contentContainerStyle={styles.list}
      />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
    padding: 12,
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
  },
});

export default FileExplorer;

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../utils/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  isDirectory: boolean; // Add this for consistency with UI
  language: string;
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
  depth: number;
}

interface GitStatusEntry {
  path: string;
  status: string;
}

interface FileStore {
  files: FileNode[];
  activeFile: FileNode | null;
  rootDir: string;
  autoSave: boolean;
  untitledCount: number;
  gitStatus: GitStatusEntry[];
  userId: string | null;
  setUserId: (id: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (file: FileNode | null) => void;
  loadFiles: () => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveAllFiles: () => Promise<void>;
  createFile: (name: string) => Promise<void>;
  createTextFile: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  toggleAutoSave: () => void;
  openExternalFile: (uri: string, name: string) => Promise<void>;
  closeFolder: () => Promise<void>;
  loadFolderRecursive: (dirPath: string, depth: number) => Promise<FileNode[]>;
  selectedFolder: string | null;
  setSelectedFolder: (path: string | null) => void;
  updateGitStatus: () => Promise<void>;
  syncFromFirestore: () => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  activeFile: null,
  rootDir: FileSystem.documentDirectory + 'projects/default/',
  autoSave: false,
  untitledCount: 1,
  gitStatus: [],
  userId: null,

  setUserId: (id) => {
    const rootDir = FileSystem.documentDirectory + (id ? `projects/${id}/` : 'projects/default/');
    set({ userId: id, rootDir, selectedFolder: rootDir });
  },

  selectedFolder: null,
  setSelectedFolder: (path) => set({ selectedFolder: path }),

  setFiles: (files) => set({ files }),
  
  setActiveFile: async (file) => {
    if (file && file.type === 'file' && !file.content) {
      try {
        const content = await FileSystem.readAsStringAsync(file.path);
        set({ activeFile: { ...file, content } });
      } catch (e) {
        set({ activeFile: { ...file, content: '' } });
      }
    } else {
      set({ activeFile: file });
    }
  },

  toggleAutoSave: () => {
    set((state) => ({ autoSave: !state.autoSave }));
  },

  loadFolderRecursive: async (dirPath: string, depth: number) => {
    const { files } = get();
    
    // Helper to find existing node state
    const findExistingNode = (nodes: FileNode[], path: string): FileNode | null => {
      for (const node of nodes) {
        if (node.id === path) return node;
        if (node.children) {
          const found = findExistingNode(node.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    try {
      const fileNames = await FileSystem.readDirectoryAsync(dirPath);
      const nodes: FileNode[] = [];
      for (const name of fileNames) {
        const path = dirPath + name;
        const info = await FileSystem.getInfoAsync(path);
        const existingNode = findExistingNode(files, path);
        
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const node: FileNode = {
          id: path,
          name,
          path,
          type: (info.isDirectory ? 'folder' : 'file') as 'file' | 'folder',
          isDirectory: info.isDirectory,
          language: ext,
          depth,
          isOpen: existingNode ? existingNode.isOpen : false,
          children: [],
        };
        
        if (info.isDirectory) {
          node.children = await get().loadFolderRecursive(path + '/', depth + 1);
        }
        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      return [];
    }
  },

  loadFiles: async () => {
    const { rootDir, loadFolderRecursive, userId, syncFromFirestore } = get();
    try {
      const dirInfo = await FileSystem.getInfoAsync(rootDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(rootDir, { intermediates: true });
        
        // If we have a userId, try to sync from cloud first
        if (userId) {
          await syncFromFirestore();
        } else {
          // Default welcome file
          const welcomePath = rootDir + 'Welcome.js';
          await FileSystem.writeAsStringAsync(welcomePath, '// Welcome to CodeMobile!\nconsole.log("Hello World!");\n');
        }
      }

      const fileNodes = await loadFolderRecursive(rootDir, 0);
      set({ files: fileNodes });
    } catch (error) {
      console.error('Error loading files:', error);
    }
  },

  syncFromFirestore: async () => {
    const { userId, rootDir } = get();
    if (!userId) return;

    try {
      const q = query(collection(db, 'users', userId, 'files'));
      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const fileData = doc.data();
        const localPath = rootDir + fileData.path;
        
        // Ensure parent directories exist
        const dirPath = localPath.substring(0, localPath.lastIndexOf('/') + 1);
        if (dirPath && dirPath !== rootDir) {
           await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        }
        
        await FileSystem.writeAsStringAsync(localPath, fileData.content || '');
      }
    } catch (error) {
      console.error('Error syncing from Firestore:', error);
    }
  },

  saveFile: async (path, content) => {
    const { userId, rootDir, activeFile } = get();
    try {
      await FileSystem.writeAsStringAsync(path, content);
      
      // Update local state
      if (activeFile && activeFile.path === path) {
        set({ activeFile: { ...activeFile, content } });
      }

      // Sync with Firestore if logged in
      if (userId) {
        const relativePath = path.replace(rootDir, '');
        const fileId = relativePath.replace(/\//g, '_');
        await setDoc(doc(db, 'users', userId, 'files', fileId), {
          name: path.split('/').pop(),
          path: relativePath,
          content: content,
          type: 'file',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  },

  saveAllFiles: async () => {
    const { activeFile, saveFile } = get();
    if (activeFile && activeFile.content !== undefined) {
      await saveFile(activeFile.path, activeFile.content);
    }
  },

  createFile: async (name: string) => {
    const { rootDir, selectedFolder, loadFiles, setActiveFile, userId } = get();
    try {
      const targetDir = selectedFolder || rootDir;
      const filePath = targetDir.endsWith('/') ? targetDir + name : targetDir + '/' + name;
      
      // Determine boilerplate
      const ext = name.split('.').pop()?.toLowerCase() || '';
      let content = '';
      if (ext === 'py') content = 'print("Hello from Python!")\n';
      else if (ext === 'js') content = 'console.log("Hello from Node.js!");\n// alert("Hello from Browser!");\n';
      else if (ext === 'html') content = '<!DOCTYPE html>\n<html>\n<head>\n  <title>Preview</title>\n</head>\n<body style="background: #1e1e1e; color: white; padding: 20px;">\n  <h1>Hello Web!</h1>\n  <script>\n    alert("Browser context activated!");\n  </script>\n</body>\n</html>\n';
      else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'h') content = '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n';
      else if (ext === 'c') content = '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}\n';
      else if (ext === 'java') content = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n';
      else if (ext === 'ts') content = 'const message: string = "Hello TypeScript!";\nconsole.log(message);\n';
      else if (ext === 'd') content = 'import std.stdio;\n\nvoid main() {\n    writeln("Hello from D Language!");\n}\n';
      else if (ext === 'f' || ext === 'f90' || ext === 'fortran') content = 'program hello\n  print *, "Hello from Fortran!"\nend program hello\n';
      else if (ext === 'rs') content = 'fn main() {\n    println!("Hello from Rust!");\n}\n';
      else if (ext === 'go') content = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n}\n';
      else if (ext === 'php') content = '<?php\necho "Hello from PHP!\\n";\n';
      else if (ext === 'rb') content = 'puts "Hello from Ruby!"\n';
      else if (ext === 'swift') content = 'print("Hello from Swift!")\n';
      else if (ext === 'sh') content = '#!/bin/bash\necho "Hello from Bash!"\n';
      else if (ext === 'kt') content = 'fun main() {\n    println("Hello from Kotlin!")\n}\n';
      
      await FileSystem.writeAsStringAsync(filePath, content);
      
      // Force immediate active file set
      const newNode: any = { 
        id: filePath, 
        name, 
        path: filePath, 
        type: 'file', 
        isDirectory: false,
        language: ext, 
        depth: 0,
        content: content
      };
      
      set({ activeFile: newNode });

      if (userId) {
          const relativePath = filePath.replace(rootDir, '');
          const fileId = relativePath.replace(/\//g, '_');
          await setDoc(doc(db, 'users', userId, 'files', fileId), {
              name,
              path: name,
              content: content,
              type: 'file',
              updatedAt: new Date().toISOString()
          });
      }

      await loadFiles();
    } catch (error) {
      console.error('Error creating file:', error);
    }
  },

  createTextFile: async () => {
    const { rootDir, loadFiles, setActiveFile, untitledCount } = get();
    try {
      const name = `Untitled-${untitledCount}.txt`;
      const filePath = rootDir + name;
      await FileSystem.writeAsStringAsync(filePath, '');
      set({ untitledCount: untitledCount + 1 });
      setActiveFile({ 
        id: filePath, 
        name, 
        path: filePath, 
        type: 'file', 
        isDirectory: false,
        language: 'text', 
        depth: 0 
      });
    } catch (error) {
      console.error('Error creating text file:', error);
    }
  },

  createFolder: async (name: string) => {
    const { rootDir, selectedFolder, loadFiles } = get();
    try {
      const targetDir = selectedFolder || rootDir;
      const folderPath = targetDir.endsWith('/') ? targetDir + name : targetDir + '/' + name;
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      await loadFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  },

  deleteItem: async (path: string) => {
    const { loadFiles, activeFile, userId, rootDir } = get();
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
      
      if (userId) {
        const relativePath = path.replace(rootDir, '');
        const fileId = relativePath.replace(/\//g, '_');
        await deleteDoc(doc(db, 'users', userId, 'files', fileId));
      }

      if (activeFile && activeFile.path === path) {
        set({ activeFile: null });
      }
      await loadFiles();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  },

  openExternalFile: async (uri: string, name: string) => {
    const { rootDir, loadFiles, setActiveFile } = get();
    try {
      // Copy the file into our project directory
      const destPath = rootDir + name;
      await FileSystem.copyAsync({ from: uri, to: destPath });
      await loadFiles();
      const content = await FileSystem.readAsStringAsync(destPath);
      const ext = name.split('.').pop()?.toLowerCase() || 'text';
      setActiveFile({ 
        id: destPath, 
        name, 
        path: destPath, 
        type: 'file', 
        isDirectory: false,
        language: ext, 
        depth: 0 
      });
    } catch (error) {
      console.error('Error opening external file:', error);
    }
  },

  closeFolder: async () => {
    const { rootDir } = get();
    // Reset to empty state
    set({ files: [], activeFile: null });
    // Re-initialize with default
    try {
      const dirInfo = await FileSystem.getInfoAsync(rootDir);
      if (dirInfo.exists) {
        // Just clear and reload
        get().loadFiles();
      }
    } catch (e) {}
  },

  toggleFolder: (path: string) => {
    const { files, selectedFolder } = get();
    
    // Set as active creation target when toggled
    set({ selectedFolder: path });

    const toggle = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggle(node.children) };
        }
        return node;
      });
    };
    set({ files: toggle(files) });
  },

  updateGitStatus: async () => {
    // This is a placeholder that will be used by GitView
    // Actual implementation depends on dir mapping between RN FS and LightningFS
    try {
      const { rootDir } = get();
      // For now we just trigger a refresh in the store
    } catch (e) {}
  },
}));

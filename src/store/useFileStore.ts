import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

// Helper to find an external URI by relative path in SAF
const findExternalFileUri = async (parentUri: string, relativePath: string): Promise<string | null> => {
  try {
    const parts = relativePath.split('/').filter(Boolean);
    let currentUri = parentUri;

    for (const part of parts) {
      const contents = await FileSystem.StorageAccessFramework.readDirectoryAsync(currentUri);
      let found = false;
      for (const itemUri of contents) {
        // Robust name extraction
        const decoded = decodeURIComponent(itemUri);
        // Remove trailing slash if it's a directory URI
        const normalized = decoded.endsWith('/') ? decoded.slice(0, -1) : decoded;
        const itemName = normalized.split('/').pop() || normalized.split(':').pop() || '';
        
        if (itemName === part) {
          currentUri = itemUri;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return currentUri;
  } catch (e) {
    return null;
  }
};

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
  isDirty?: boolean;
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
  exportProject: () => Promise<void>;
  createFile: (name: string) => Promise<void>;
  createTextFile: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  deleteItems: (paths: string[]) => Promise<void>;
  toggleFolder: (path: string) => void;
  toggleAutoSave: () => void;
  importFile: (uri: string, name: string) => Promise<void>;
  importFiles: (assets: { uri: string; name: string }[]) => Promise<void>;
  pickDirectory: () => Promise<void>;
  importFolder: () => Promise<void>;
  closeFolder: () => Promise<void>;
  loadFolderRecursive: (dirPath: string, depth: number) => Promise<FileNode[]>;
  selectedFolder: string | null;
  setSelectedFolder: (path: string | null) => void;
  externalRootUri: string | null;
  setExternalRootUri: (uri: string | null) => Promise<void>;
  updateGitStatus: () => Promise<void>;
  syncFromFirestore: () => Promise<void>;
  updateActiveFileContent: (content: string) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  activeFile: null,
  rootDir: FileSystem.documentDirectory + 'projects/default/',
  autoSave: false,
  untitledCount: 1,
  gitStatus: [],
  userId: null,
  externalRootUri: null,
  setExternalRootUri: async (uri) => {
    set({ externalRootUri: uri });
    if (uri) {
      await AsyncStorage.setItem('externalRootUri', uri);
    } else {
      await AsyncStorage.removeItem('externalRootUri');
    }
  },

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
          content: existingNode ? existingNode.content : undefined,
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
      // Restore external root URI from storage
      const savedExternalUri = await AsyncStorage.getItem('externalRootUri');
      if (savedExternalUri) {
          set({ externalRootUri: savedExternalUri });
      }

      const dirInfo = await FileSystem.getInfoAsync(rootDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(rootDir, { intermediates: true });
        
        // If we have a userId and NO local folder open, try to sync from cloud
        const { externalRootUri } = get();
        if (userId && !externalRootUri) {
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
    const { userId, rootDir, activeFile, externalRootUri, files } = get();
    
    // Check if the file is already clean (prevent redundant saves)
    const findNode = (nodes: FileNode[], p: string): FileNode | null => {
      for (const n of nodes) {
        if (n.path === p) return n;
        if (n.children) {
          const found = findNode(n.children, p);
          if (found) return found;
        }
      }
      return null;
    };
    const node = findNode(files, path);
    if (node && !node.isDirty && node.content === content) {
      console.log('Skipping save for clean file:', path);
      return;
    }

    try {
      await FileSystem.writeAsStringAsync(path, content);
      
      // Mirror to external storage if active
      if (externalRootUri) {
         try {
            const relativePath = path.replace(rootDir, '');
            // On SAF, we have to find or create the file by path
            // For simplicity, we try to create (it will overwrite or we can write to existing)
            // But SAF createFileAsync often creates a new one with (1) if exists.
            // Better: find if it exists first.
            let fileUri = await findExternalFileUri(externalRootUri, relativePath);
            if (!fileUri) {
                // Create it if it doesn't exist
                const parts = relativePath.split('/');
                const fileName = parts.pop() || 'new_file';
                const parentPath = parts.join('/');
                let parentUri = externalRootUri;
                if (parentPath) {
                    parentUri = await findExternalFileUri(externalRootUri, parentPath) || externalRootUri;
                }
                fileUri = await FileSystem.StorageAccessFramework.createFileAsync(parentUri, fileName, 'text/plain');
            }
            if (fileUri) {
                console.log('Mirroring edit to:', fileUri);
                await FileSystem.writeAsStringAsync(fileUri, content);
            }
         } catch (e) {
             console.error('External mirror save error:', e);
         }
      }

      // Update local state
      // Update in files tree for "save all" consistency
      const updateNodeStatus = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.path === path) return { ...node, content, isDirty: false };
          if (node.children) return { ...node, children: updateNodeStatus(node.children) };
          return node;
        });
      };
      set({ files: updateNodeStatus(get().files) });

      if (activeFile && activeFile.path === path) {
        set({ activeFile: { ...activeFile, content, isDirty: false } });
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  },

  saveAllFiles: async () => {
    const { files, saveFile, externalRootUri, rootDir } = get();
    
    // 1. Recursive save all files in project
    const recursiveSave = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (!node.isDirectory && node.isDirty) {
           await saveFile(node.path, node.content || '');
        }
        if (node.children) await recursiveSave(node.children);
      }
    };
    await recursiveSave(files);

    // 2. Prune external storage if linked (DANGEROUS CLEAN MIRROR)
    if (externalRootUri) {
        console.log('Pruning external folder to match IDE state...');
        const pruneExternalRecursive = async (targetUri: string, currentRelativePath: string) => {
            try {
                const contents = await FileSystem.StorageAccessFramework.readDirectoryAsync(targetUri);
                for (const itemUri of contents) {
                    const decoded = decodeURIComponent(itemUri);
                    const normalized = decoded.endsWith('/') ? decoded.slice(0, -1) : decoded;
                    const itemName = normalized.split('/').pop() || normalized.split(':').pop() || '';
                    if (!itemName) continue;
                    
                    const relativePath = currentRelativePath ? `${currentRelativePath}/${itemName}` : itemName;
                    
                    // Check if this relative path exists in our internal sandbox
                    const existsLocally = await FileSystem.getInfoAsync(rootDir + relativePath);
                    if (!existsLocally.exists) {
                        console.log('Pruning orphaned external item:', relativePath);
                        try {
                            await FileSystem.StorageAccessFramework.deleteAsync(itemUri);
                        } catch (e) {
                            console.error('Failed to delete external orphan:', itemUri, e);
                        }
                    } else if (existsLocally.isDirectory) {
                        // Recurse into directory
                        await pruneExternalRecursive(itemUri, relativePath);
                    }
                }
            } catch (e) {
                console.error('Pruning scan error:', e);
            }
        };
        await pruneExternalRecursive(externalRootUri, '');
        console.log('Clean Sync complete.');
    }
  },

  exportProject: async () => {
    const { rootDir, files } = get();
    try {
      if (Platform.OS === 'android') {
        Alert.alert(
          'Export Project',
          'Choose a location on your phone where you want to save the entire project.',
          [
            {
              text: 'Export',
              onPress: async () => {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  const targetBaseUri = permissions.directoryUri;
                  const { loadFiles, rootDir } = get();
                  await get().setExternalRootUri(targetBaseUri);
                  
                  // 2-Way Link: First, import what's already on the phone into the app
                  // This prevents "Empty App" from deleting "Full Phone Folder"
                  const importUriRecursive = async (uri: string, relativePath: string = '') => {
                    const contents = await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
                    for (const itemUri of contents) {
                        const decodedUri = decodeURIComponent(itemUri);
                        const normalized = decodedUri.endsWith('/') ? decodedUri.slice(0, -1) : decodedUri;
                        const parts = normalized.split('/');
                        let name = parts.pop() || '';
                        
                        if (name.includes(':')) name = name.split(':').pop() || name;
                        const currentRelativePath = relativePath ? relativePath + '/' + name : name;
                        
                        let isDir = false;
                        try {
                            await FileSystem.StorageAccessFramework.readDirectoryAsync(itemUri);
                            isDir = true;
                        } catch (e) {}

                        if (isDir) {
                            const destDir = rootDir + currentRelativePath + '/';
                            await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
                            await importUriRecursive(itemUri, currentRelativePath);
                        } else {
                            const destPath = rootDir + currentRelativePath;
                            const parentDir = destPath.substring(0, destPath.lastIndexOf('/') + 1);
                            await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
                            await FileSystem.copyAsync({ from: itemUri, to: destPath });
                        }
                    }
                  };

                  console.log('Merging phone folder with internal project...');
                  await importUriRecursive(targetBaseUri);
                  await loadFiles();
                  
                  // Now sync internal project back to phone folder
                  const writeFilesToSAF = async (nodes: FileNode[], currentRelativePath: string) => {
                    for (const node of nodes) {
                      const relativePath = currentRelativePath ? `${currentRelativePath}/${node.name}` : node.name;
                      
                      if (node.isDirectory) {
                        try {
                            // Find or create directory
                            let dirUri = await findExternalFileUri(targetBaseUri, relativePath);
                            if (!dirUri) {
                                await FileSystem.StorageAccessFramework.makeDirectoryAsync(targetBaseUri, relativePath);
                            }
                        } catch (e) {}
                        if (node.children) await writeFilesToSAF(node.children, relativePath);
                      } else {
                        try {
                            // Find or create file
                            let fileUri = await findExternalFileUri(targetBaseUri, relativePath);
                            if (!fileUri) {
                                // Find parent URI (robust handle for root files)
                                const parts = relativePath.split('/');
                                const fileName = parts.pop() || 'file';
                                const parentPath = parts.join('/');
                                let parentUri = targetBaseUri;
                                if (parentPath) {
                                  parentUri = await findExternalFileUri(targetBaseUri, parentPath) || targetBaseUri;
                                }
                                fileUri = await FileSystem.StorageAccessFramework.createFileAsync(parentUri, fileName, 'text/plain');
                            }
                            
                            if (fileUri) {
                                const content = await FileSystem.readAsStringAsync(node.path);
                                await FileSystem.writeAsStringAsync(fileUri, content);
                            }
                        } catch (e) {}
                      }
                    }
                  };

                  await writeFilesToSAF(files, '');
                  Alert.alert('✓ Project Linked', 'Project exported. Any future deletes or edits will now sync to this folder in real-time.');
                }
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        alert("Exporting project to phone is currently best supported on Android.");
      }
    } catch (e) {
      console.error('Export error:', e);
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
      else if (ext === 'lua') content = 'print("Hello from Lua!")\n';
      else if (ext === 'ex' || ext === 'exs') content = 'IO.puts "Hello from Elixir!"\n';
      else if (ext === 'hs') content = 'main = putStrLn "Hello from Haskell!"\n';
      else if (ext === 'r') content = 'print("Hello from R!")\n';
      else if (ext === 'scala') content = 'object Main extends App {\n  println("Hello from Scala!")\n}\n';
      else if (ext === 'jl') content = 'println("Hello from Julia!")\n';
      else if (ext === 'pl' && name.endsWith('.pl')) content = 'print "Hello from Perl!\\n";\n';
      else if (ext === 'zig') content = 'const std = @import("std");\n\npub fn main() !void {\n    std.debug.print("Hello from Zig!\\n", .{});\n}\n';
      else if (ext === 'nim') content = 'echo "Hello from Nim!"\n';
      else if (ext === 'clj') content = '(println "Hello from Clojure!")\n';
      else if (ext === 'groovy') content = 'println "Hello from Groovy!"\n';
      else if (ext === 'pas') content = 'program Hello;\nbegin\n  writeln(\'Hello from Pascal!\');\nend.\n';
      else if (ext === 'pro') content = 'main :- write(\'Hello from Prolog!\'), nl.\n';
      else if (ext === 'lisp') content = '(write-line "Hello from Lisp!")\n';
      
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

      if (userId && !get().externalRootUri) {
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

      // Mirror to external storage
      if (get().externalRootUri) {
          try {
              const relativePath = filePath.replace(rootDir, '');
              const parts = relativePath.split('/');
              const fileName = parts.pop() || 'new_file';
              const parentPath = parts.join('/');
              let parentUri = get().externalRootUri!;
              if (parentPath) {
                  parentUri = await findExternalFileUri(parentUri, parentPath) || parentUri;
              }
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(parentUri, fileName, 'text/plain');
              if (fileUri) {
                  await FileSystem.writeAsStringAsync(fileUri, content);
              }
          } catch (e) {
              console.error('Mirror create error:', e);
          }
      }

      // Optimistic file tree update
      const addNewNodeToTree = (nodes: FileNode[], targetPath: string, node: FileNode): FileNode[] => {
        if (targetPath === get().rootDir) return [...nodes, node];
        return nodes.map((n) => {
          if (n.path === targetPath) return { ...n, children: [...(n.children || []), node], isOpen: true };
          if (n.children) return { ...n, children: addNewNodeToTree(n.children, targetPath, node) };
          return n;
        });
      };
      set({ files: addNewNodeToTree(get().files, targetDir, newNode) });
      
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
    const { rootDir, selectedFolder, loadFiles, externalRootUri } = get();
    try {
      const targetDir = selectedFolder || rootDir;
      const folderPath = targetDir.endsWith('/') ? targetDir + name : targetDir + '/' + name;
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      
      // Mirror to external
      if (externalRootUri) {
        try {
          const relativePath = folderPath.replace(rootDir, '');
          const parts = relativePath.split('/');
          const folderName = parts.pop() || 'new_folder';
          const parentPath = parts.join('/');
          let parentUri = externalRootUri;
          if (parentPath) {
            parentUri = await findExternalFileUri(parentUri, parentPath) || externalRootUri;
          }
          await FileSystem.StorageAccessFramework.makeDirectoryAsync(parentUri, folderName);
        } catch (e) {
            console.error('Mirror folder error:', e);
        }
      }

      await loadFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  },

  deleteItem: async (path: string) => {
    const { loadFiles, activeFile, externalRootUri } = get();
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
      
      // Mirror to external
      if (externalRootUri) {
          const { rootDir } = get();
          const relativePath = path.replace(rootDir, '');
          const fileUri = await findExternalFileUri(externalRootUri, relativePath);
          if (fileUri) {
              console.log('Mirroring delete to:', fileUri);
              await FileSystem.StorageAccessFramework.deleteAsync(fileUri);
          }
      }

      // Optimistic update
      const removeFromTree = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .filter(node => node.path !== path)
          .map(node => ({
            ...node,
            children: node.children ? removeFromTree(node.children) : undefined
          }));
      };
      set({ files: removeFromTree(get().files) });

      if (activeFile && (activeFile.path === path || activeFile.path.startsWith(path + '/'))) {
        set({ activeFile: null });
      }

      await loadFiles();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  },
  
  deleteItems: async (paths: string[]) => {
    const { loadFiles, activeFile, externalRootUri, rootDir } = get();
    try {
      for (const path of paths) {
        await FileSystem.deleteAsync(path, { idempotent: true });
        
        // Mirror to external
        if (externalRootUri) {
            const relativePath = path.replace(rootDir, '');
            const fileUri = await findExternalFileUri(externalRootUri, relativePath);
            if (fileUri) {
                console.log('Mirroring bulk delete to:', fileUri);
                await FileSystem.StorageAccessFramework.deleteAsync(fileUri);
            }
        }

        // Optimistic clear from activeFile if involved
        if (activeFile && (activeFile.path === path || activeFile.path.startsWith(path + '/'))) {
          set({ activeFile: null });
        }
      }

      await loadFiles();
    } catch (error) {
      console.error('Error in multi-delete:', error);
    }
  },

  importFile: async (uri: string, name: string) => {
    return get().importFiles([{ uri, name }]);
  },

  importFiles: async (assets: { uri: string; name: string }[]) => {
    const { rootDir, loadFiles } = get();
    try {
      let firstFilePath = '';
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const destPath = rootDir + asset.name;
        await FileSystem.copyAsync({ from: asset.uri, to: destPath });
        
        // Mirror to external
        const { externalRootUri } = get();
        if (externalRootUri) {
           try {
              const content = await FileSystem.readAsStringAsync(destPath);
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(externalRootUri, asset.name, 'text/plain');
              if (fileUri) {
                  await FileSystem.writeAsStringAsync(fileUri, content);
              }
           } catch (e) {
               console.error('Mirror import error:', e);
           }
        }
        if (i === 0) firstFilePath = destPath;
      }
      
      await loadFiles();
      
      if (firstFilePath) {
         const { files: updatedFiles, setActiveFile } = get();
         const findNode = (nodes: any[], path: string): any | null => {
            for (const n of nodes) {
                if (n.path === path) return n;
                if (n.children) {
                    const found = findNode(n.children, path);
                    if (found) return found;
                }
            }
            return null;
         };
         const newNode = findNode(updatedFiles, firstFilePath);
         if (newNode) setActiveFile(newNode);
      }
    } catch (error) {
      console.error('Error batch importing files:', error);
    }
  },

  importFolder: async () => {
    return get().pickDirectory();
  },

  pickDirectory: async () => {
    const { rootDir, loadFiles } = get();
    try {
      if (Platform.OS === 'android') {
        // Inform the user how to select a folder on Android
        Alert.alert(
          'Select Folder',
          'Navigate to your project folder and click "USE THIS FOLDER" or "SELECT" at the bottom to import it.',
          [
            {
              text: 'OK',
              onPress: async () => {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                    const directoryUri = permissions.directoryUri;
                    
                    // Helper to recursively import a directory
                    const importUriRecursive = async (uri: string, relativePath: string = '') => {
                       const contents = await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
                       for (const itemUri of contents) {
                           // Robust way to get the name from a SAF URI
                           // Usually everything after the last %2F in the document ID
                           const decodedUri = decodeURIComponent(itemUri);
                           const parts = decodedUri.split('/');
                           let name = parts.pop() || '';
                           if (!name && parts.length > 0) name = parts.pop() || '';
                           
                           // If it's a SAF URI, it might have a : separator for the ID
                           if (name.includes(':')) {
                               name = name.split(':').pop() || name;
                           }

                           const currentRelativePath = relativePath ? relativePath + '/' + name : name;
                           
                           // Check if it's a directory by trying to read it or using URI pattern
                           // SAF directory URIs often contain '/tree/' and lack '/document/' at the end 
                           // or simply end with a separator.
                           let isDir = itemUri.endsWith('%2F');
                           if (!isDir) {
                               try {
                                   // If we can read it as a directory, it is one
                                   await FileSystem.StorageAccessFramework.readDirectoryAsync(itemUri);
                                   isDir = true;
                               } catch (e) {
                                   isDir = false;
                               }
                           }

                           if (isDir) {
                               const destDir = rootDir + currentRelativePath + '/';
                               await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
                               await importUriRecursive(itemUri, currentRelativePath);
                           } else {
                               const destPath = rootDir + currentRelativePath;
                               const parentDir = destPath.substring(0, destPath.lastIndexOf('/') + 1);
                               await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
                               await FileSystem.copyAsync({ from: itemUri, to: destPath });
                           }
                       }
                    };

                    await importUriRecursive(directoryUri);
                    get().setExternalRootUri(directoryUri);
                    await loadFiles();
                }
              }
            }
          ]
        );
      } else {
          alert("Recursive import for folders is currently best supported on Android. For iOS, please select multiple files.");
      }
    } catch (error) {
        console.error('Error picking directory:', error);
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

  updateActiveFileContent: (content) => {
    const { activeFile, files } = get();
    if (!activeFile) return;
    if (activeFile.content === content) return;

    // Update in files tree for "save all" consistency
    const updateNodeContent = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === activeFile.path) {
          return { ...node, content, isDirty: true };
        }
        if (node.children) return { ...node, children: updateNodeContent(node.children) };
        return node;
      });
    };
    set({ files: updateNodeContent(files) });

    // Update active file
    set({ activeFile: { ...activeFile, content, isDirty: true } });
  },
}));

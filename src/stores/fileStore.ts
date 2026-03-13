import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as ipc from '@/lib/ipc';

/**
 * Sanitize a filename to prevent path traversal attacks.
 * Rejects names containing '..', '/', '\', or absolute paths.
 */
function sanitizeFileName(name: string): string | null {
  // Reject empty names
  if (!name || name.trim().length === 0) {
    return null;
  }

  const trimmed = name.trim();

  // Reject paths with directory traversal
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }

  // Reject absolute paths (Windows and Unix)
  if (/^[a-zA-Z]:/.test(trimmed) || trimmed.startsWith('/')) {
    return null;
  }

  // Re reserved filenames on Windows
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reserved.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isModified: boolean;
  isLoading: boolean;
  language?: string;
  isReadOnly?: boolean;
}

interface FileState {
  // File tree
  fileTree: FileNode[];
  activePath: string | null;
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;

  // Tabs
  openTabs: FileTab[];
  activeTabId: string | null;

  // Context menu
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    path: string | null;
    type: 'file' | 'directory' | 'root' | null;
  };

  // New file/folder dialog
  newItemDialog: {
    isOpen: boolean;
    type: 'file' | 'directory';
    parentPath: string;
  };

  // Rename dialog
  renameDialog: {
    isOpen: boolean;
    path: string | null;
    currentName: string;
  };

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDirectory: (path: string, expand?: boolean) => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  expandPath: (path: string) => void;
  collapsePath: (path: string) => void;
  selectPath: (path: string, multi?: boolean) => void;
  clearSelection: () => void;

  // File operations
  openFile: (path: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  saveFile: (tabId: string) => Promise<boolean>;
  saveAllFiles: () => Promise<void>;
  updateFileContent: (tabId: string, content: string) => void;
  discardChanges: (tabId: string) => void;

  // CRUD operations
  createFile: (parentPath: string, name: string) => Promise<boolean>;
  createDirectory: (parentPath: string, name: string) => Promise<boolean>;
  renameFile: (oldPath: string, newName: string) => Promise<boolean>;
  deleteFile: (path: string) => Promise<boolean>;
  deleteMultiple: (paths: string[]) => Promise<boolean>;

  // Context menu
  openContextMenu: (x: number, y: number, path: string, type: 'file' | 'directory' | 'root') => void;
  closeContextMenu: () => void;

  // Dialogs
  openNewItemDialog: (type: 'file' | 'directory', parentPath: string) => void;
  closeNewItemDialog: () => void;
  openRenameDialog: (path: string) => void;
  closeRenameDialog: () => void;

  // Refresh
  refreshFileTree: () => Promise<void>;
  loadProject: (projectPath: string) => Promise<void>;

  // Search
  searchFiles: (query: string, path: string) => Promise<FileNode[]>;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'sh': 'bash',
    'vue': 'vue',
    'svelte': 'svelte',
    'sql': 'sql',
    'xml': 'xml',
    'dockerfile': 'dockerfile',
  };
  return languageMap[ext || ''] || 'text';
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      fileTree: [],
      activePath: null,
      expandedPaths: new Set(),
      selectedPaths: new Set(),
      openTabs: [],
      activeTabId: null,
      contextMenu: { isOpen: false, x: 0, y: 0, path: null, type: null },
      newItemDialog: { isOpen: false, type: 'file', parentPath: '' },
      renameDialog: { isOpen: false, path: null, currentName: '' },
      isLoading: false,
      error: null,

      loadDirectory: async (dirPath: string, expand = false) => {
        try {
          const entries = await ipc.listDirectory(dirPath);
          const nodes: FileNode[] = entries.map((entry) => ({
            name: entry.name,
            path: entry.path,
            isDir: entry.isDir,
            size: entry.size,
            children: entry.isDir ? [] : undefined,
            isExpanded: false,
          }));

          // Sort: directories first, then files
          nodes.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });

          set((state) => {
            const newExpandedPaths = new Set(state.expandedPaths);
            if (expand) {
              newExpandedPaths.add(dirPath);
            }

            // Update file tree with new nodes
            const updateTree = (tree: FileNode[]): FileNode[] => {
              return tree.map((node) => {
                if (node.path === dirPath) {
                  return { ...node, children: nodes, isLoading: false };
                }
                if (node.children) {
                  return { ...node, children: updateTree(node.children) };
                }
                return node;
              });
            };

            // If loading root level
            if (state.fileTree.length === 0 || dirPath === state.fileTree[0]?.path) {
              return { fileTree: nodes, expandedPaths: newExpandedPaths };
            }

            return {
              fileTree: updateTree(state.fileTree),
              expandedPaths: newExpandedPaths,
            };
          });
        } catch (error) {
          console.error('Failed to load directory:', error);
          set({ error: String(error) });
        }
      },

      toggleDirectory: async (dirPath: string) => {
        const { expandedPaths, loadDirectory } = get();

        if (expandedPaths.has(dirPath)) {
          set((state) => {
            const newExpanded = new Set(state.expandedPaths);
            newExpanded.delete(dirPath);
            return { expandedPaths: newExpanded };
          });
        } else {
          await loadDirectory(dirPath, true);
        }
      },

      expandPath: (path: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedPaths);
          newExpanded.add(path);
          return { expandedPaths: newExpanded };
        });
      },

      collapsePath: (path: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedPaths);
          newExpanded.delete(path);
          return { expandedPaths: newExpanded };
        });
      },

      selectPath: (path: string, multi = false) => {
        set((state) => {
          if (multi) {
            const newSelected = new Set(state.selectedPaths);
            if (newSelected.has(path)) {
              newSelected.delete(path);
            } else {
              newSelected.add(path);
            }
            return { selectedPaths: newSelected };
          }
          return { selectedPaths: new Set([path]) };
        });
      },

      clearSelection: () => {
        set({ selectedPaths: new Set() });
      },

      openFile: async (filePath: string) => {
        const { openTabs, selectTab } = get();

        // Check if already open
        const existingTab = openTabs.find((tab) => tab.path === filePath);
        if (existingTab) {
          selectTab(existingTab.id);
          return;
        }

        // Create new tab
        const tabId = `tab_${Date.now()}`;
        const fileName = filePath.split(/[/\\]/).pop() || 'untitled';

        set((state) => ({
          openTabs: [
            ...state.openTabs,
            {
              id: tabId,
              path: filePath,
              name: fileName,
              content: '',
              originalContent: '',
              isModified: false,
              isLoading: true,
              language: getLanguageFromPath(filePath),
            },
          ],
          activeTabId: tabId,
          activePath: filePath,
        }));

        try {
          const content = await ipc.readFile(filePath);
          set((state) => ({
            openTabs: state.openTabs.map((tab) =>
              tab.id === tabId
                ? { ...tab, content, originalContent: content, isLoading: false }
                : tab
            ),
          }));
        } catch (error) {
          console.error('Failed to read file:', error);
          set((state) => ({
            openTabs: state.openTabs.map((tab) =>
              tab.id === tabId ? { ...tab, isLoading: false } : tab
            ),
            error: String(error),
          }));
        }
      },

      closeTab: (tabId: string) => {
        set((state) => {
          const tabIndex = state.openTabs.findIndex((t) => t.id === tabId);
          const newTabs = state.openTabs.filter((t) => t.id !== tabId);

          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabId && newTabs.length > 0) {
            const newIndex = Math.min(tabIndex, newTabs.length - 1);
            newActiveTabId = newTabs[Math.max(0, newIndex)].id;
          } else if (newTabs.length === 0) {
            newActiveTabId = null;
          }

          return {
            openTabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      closeAllTabs: () => {
        set({ openTabs: [], activeTabId: null });
      },

      closeOtherTabs: (tabId: string) => {
        set((state) => ({
          openTabs: state.openTabs.filter((t) => t.id === tabId),
          activeTabId: tabId,
        }));
      },

      selectTab: (tabId: string) => {
        const tab = get().openTabs.find((t) => t.id === tabId);
        set({
          activeTabId: tabId,
          activePath: tab?.path || null,
        });
      },

      updateFileContent: (tabId: string, content: string) => {
        set((state) => ({
          openTabs: state.openTabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, content, isModified: tab.originalContent !== content }
              : tab
          ),
        }));
      },

      saveFile: async (tabId: string) => {
        const tab = get().openTabs.find((t) => t.id === tabId);
        if (!tab || !tab.isModified) return true;

        try {
          await ipc.writeFile(tab.path, tab.content);
          set((state) => ({
            openTabs: state.openTabs.map((t) =>
              t.id === tabId
                ? { ...t, isModified: false, originalContent: t.content }
                : t
            ),
          }));
          return true;
        } catch (error) {
          console.error('Failed to save file:', error);
          set({ error: String(error) });
          return false;
        }
      },

      saveAllFiles: async () => {
        const { openTabs } = get();
        const modifiedTabs = openTabs.filter((t) => t.isModified);

        for (const tab of modifiedTabs) {
          await get().saveFile(tab.id);
        }
      },

      discardChanges: (tabId: string) => {
        set((state) => ({
          openTabs: state.openTabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, content: tab.originalContent, isModified: false }
              : tab
          ),
        }));
      },

      createFile: async (parentPath: string, name: string) => {
        try {
          const sanitizedName = sanitizeFileName(name);
          if (!sanitizedName) {
            set({ error: 'Invalid file name' });
            return false;
          }
          const filePath = `${parentPath}/${sanitizedName}`;
          await ipc.writeFile(filePath, '');
          await get().refreshFileTree();
          // Open the new file
          await get().openFile(filePath);
          return true;
        } catch (error) {
          console.error('Failed to create file:', error);
          set({ error: String(error) });
          return false;
        }
      },

      createDirectory: async (parentPath: string, name: string) => {
        try {
          const sanitizedName = sanitizeFileName(name);
          if (!sanitizedName) {
            set({ error: 'Invalid directory name' });
            return false;
          }
          const dirPath = `${parentPath}/${sanitizedName}`;
          await ipc.createDirectory(dirPath);
          await get().refreshFileTree();
          return true;
        } catch (error) {
          console.error('Failed to create directory:', error);
          set({ error: String(error) });
          return false;
        }
      },

      renameFile: async (oldPath: string, newName: string) => {
        try {
          const sanitizedName = sanitizeFileName(newName);
          if (!sanitizedName) {
            set({ error: 'Invalid file name' });
            return false;
          }
          const parentPath = oldPath.split(/[/\\]/).slice(0, -1).join('/');
          const newPath = `${parentPath}/${sanitizedName}`;
          await ipc.renameFile(oldPath, newPath);

          // Update tabs if file is open
          set((state) => ({
            openTabs: state.openTabs.map((tab) =>
              tab.path === oldPath
                ? { ...tab, path: newPath, name: newName }
                : tab
            ),
          }));

          await get().refreshFileTree();
          return true;
        } catch (error) {
          console.error('Failed to rename file:', error);
          set({ error: String(error) });
          return false;
        }
      },

      deleteFile: async (filePath: string) => {
        try {
          await ipc.deleteFile(filePath);

          // Close tab if file is open
          const tab = get().openTabs.find((t) => t.path === filePath);
          if (tab) {
            get().closeTab(tab.id);
          }

          await get().refreshFileTree();
          return true;
        } catch (error) {
          console.error('Failed to delete file:', error);
          set({ error: String(error) });
          return false;
        }
      },

      deleteMultiple: async (paths: string[]) => {
        try {
          for (const path of paths) {
            await ipc.deleteFile(path);
            const tab = get().openTabs.find((t) => t.path === path);
            if (tab) {
              get().closeTab(tab.id);
            }
          }
          await get().refreshFileTree();
          return true;
        } catch (error) {
          console.error('Failed to delete files:', error);
          set({ error: String(error) });
          return false;
        }
      },

      openContextMenu: (x, y, path, type) => {
        set({ contextMenu: { isOpen: true, x, y, path, type } });
      },

      closeContextMenu: () => {
        set({ contextMenu: { isOpen: false, x: 0, y: 0, path: null, type: null } });
      },

      openNewItemDialog: (type, parentPath) => {
        set({ newItemDialog: { isOpen: true, type, parentPath } });
      },

      closeNewItemDialog: () => {
        set({ newItemDialog: { isOpen: false, type: 'file', parentPath: '' } });
      },

      openRenameDialog: (path: string) => {
        const name = path.split(/[/\\]/).pop() || '';
        set({ renameDialog: { isOpen: true, path, currentName: name } });
      },

      closeRenameDialog: () => {
        set({ renameDialog: { isOpen: false, path: null, currentName: '' } });
      },

      refreshFileTree: async () => {
        const { fileTree } = get();
        if (fileTree.length > 0) {
          // Reload all expanded directories
          const { expandedPaths } = get();
          for (const path of expandedPaths) {
            await get().loadDirectory(path);
          }
        }
      },

      loadProject: async (projectPath: string) => {
        set({ isLoading: true, fileTree: [] });
        try {
          await get().loadDirectory(projectPath);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: String(error) });
        }
      },

      searchFiles: async (query: string, path: string) => {
        // Simple recursive search - could be optimized
        const results: FileNode[] = [];

        const searchRecursive = async (dirPath: string) => {
          try {
            const entries = await ipc.listDirectory(dirPath);
            for (const entry of entries) {
              if (entry.name.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  name: entry.name,
                  path: entry.path,
                  isDir: entry.isDir,
                });
              }
              if (entry.isDir) {
                await searchRecursive(entry.path);
              }
            }
          } catch (error) {
            console.error('Search error:', error);
          }
        };

        await searchRecursive(path);
        return results;
      },
    }),
    {
      name: 'multipilot-files',
      partialize: (state) => ({
        expandedPaths: Array.from(state.expandedPaths),
      }),
      merge: (persisted: any, currentState: FileState) => ({
        ...currentState,
        ...persisted,
        // Restore expandedPaths from Array back to Set
        expandedPaths: new Set(persisted?.expandedPaths || []),
        // Ensure selectedPaths is always a Set
        selectedPaths: new Set(),
      }),
    }
  )
);

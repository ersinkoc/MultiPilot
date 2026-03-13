import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  FolderOpen,
  RefreshCw,
  FolderTree,
  ChevronRight,
  Search,
  FilePlus,
  FolderPlus,
  X,
} from 'lucide-react';
import type { FileNode } from '@/stores/fileStore';
import { useProjectStore } from '@/stores/projectStore';
import { useFileStore } from '@/stores/fileStore';
import { FileTree } from './FileTree';
import { FileViewerTabs } from './FileViewerTabs';
import { FileViewer } from './FileViewer';
import { FileContextMenu } from './FileContextMenu';
import { NewItemDialog } from './NewItemDialog';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

export function FileManager() {
  const { activeProject } = useProjectStore();
  const { openTabs, activeTabId } = useFileStore();

  // File store state and actions
  const {
    fileTree,
    isLoading,
    error,
    expandedPaths,
    selectedPaths,
    activePath,
    contextMenu,
    newItemDialog,
    renameDialog,
    loadProject,
    refreshFileTree,
    openFile,
    openContextMenu,
    closeContextMenu,
    openNewItemDialog,
    closeNewItemDialog,
    createFile,
    createDirectory,
    openRenameDialog,
    closeRenameDialog,
    renameFile,
    deleteFile,
    deleteMultiple,
  } = useFileStore();

  // Load project when active project changes
  useEffect(() => {
    if (activeProject) {
      loadProject(activeProject.path);
    }
  }, [activeProject, loadProject]);

  const handleRefresh = useCallback(() => {
    refreshFileTree();
  }, [refreshFileTree]);

  const handleFileSelect = useCallback(
    async (path: string) => {
      await openFile(path);
      // Switch to files view
      useProjectStore.getState().setViewMode('files');
    },
    [openFile]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, path?: string, type?: 'file' | 'directory' | 'root') => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(e.clientX, e.clientY, path || activeProject?.path || '', type || 'root');
    },
    [openContextMenu, activeProject]
  );

  // Dialog handlers
  const handleCreateFileConfirm = useCallback(
    async (name: string) => {
      const parentPath = newItemDialog.parentPath || activeProject?.path;
      if (parentPath) {
        await createFile(parentPath, name);
      }
    },
    [createFile, newItemDialog.parentPath, activeProject]
  );

  const handleCreateFolderConfirm = useCallback(
    async (name: string) => {
      const parentPath = newItemDialog.parentPath || activeProject?.path;
      if (parentPath) {
        await createDirectory(parentPath, name);
      }
    },
    [createDirectory, newItemDialog.parentPath, activeProject]
  );

  const handleRenameConfirm = useCallback(
    async (newName: string) => {
      if (renameDialog.path) {
        await renameFile(renameDialog.path, newName);
      }
    },
    [renameFile, renameDialog.path]
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pathsToDelete, setPathsToDelete] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter file tree by search query
  const filteredFileTree = useMemo(() => {
    if (!searchQuery.trim()) return fileTree;
    const q = searchQuery.toLowerCase();
    function filterNodes(nodes: FileNode[]): FileNode[] {
      const result: FileNode[] = [];
      for (const node of nodes) {
        if (node.isDir && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            result.push({ ...node, children: filteredChildren, isExpanded: true });
          } else if (node.name.toLowerCase().includes(q)) {
            result.push(node);
          }
        } else if (node.name.toLowerCase().includes(q)) {
          result.push(node);
        }
      }
      return result;
    }
    return filterNodes(fileTree);
  }, [fileTree, searchQuery]);

  const handleDeleteClick = useCallback(() => {
    if (contextMenu.path) {
      setPathsToDelete([contextMenu.path]);
      setDeleteDialogOpen(true);
      closeContextMenu();
    }
  }, [contextMenu.path, closeContextMenu]);

  const handleDeleteConfirm = useCallback(async () => {
    if (pathsToDelete.length === 1) {
      await deleteFile(pathsToDelete[0]);
    } else if (pathsToDelete.length > 1) {
      await deleteMultiple(pathsToDelete);
    }
    setDeleteDialogOpen(false);
    setPathsToDelete([]);
  }, [deleteFile, deleteMultiple, pathsToDelete]);

  const handleNewFileClick = useCallback(() => {
    const parentPath = contextMenu.path || activeProject?.path || '';
    openNewItemDialog('file', parentPath);
    closeContextMenu();
  }, [contextMenu.path, activeProject, openNewItemDialog, closeContextMenu]);

  const handleNewFolderClick = useCallback(() => {
    const parentPath = contextMenu.path || activeProject?.path || '';
    openNewItemDialog('directory', parentPath);
    closeContextMenu();
  }, [contextMenu.path, activeProject, openNewItemDialog, closeContextMenu]);

  const handleRenameClick = useCallback(() => {
    if (contextMenu.path) {
      openRenameDialog(contextMenu.path);
      closeContextMenu();
    }
  }, [contextMenu.path, openRenameDialog, closeContextMenu]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FolderOpen className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
        <h3 className="text-sm font-medium mb-1">No Project Selected</h3>
        <p className="text-xs text-muted-foreground">Select a project from the sidebar to view files.</p>
      </div>
    );
  }

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex h-full">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="font-medium text-xs">Explorer</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openNewItemDialog('file', activeProject.path)}
              className="p-1.5 rounded-md hover:bg-secondary"
              title="New File"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openNewItemDialog('directory', activeProject.path)}
              className="p-1.5 rounded-md hover:bg-secondary"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-md hover:bg-secondary ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Name */}
        <div className="px-3 py-1.5 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium truncate">{activeProject.name}</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-8 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* File Tree */}
        <div
          className="flex-1 overflow-auto p-2"
          onContextMenu={(e) => handleContextMenu(e, activeProject.path, 'root')}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-3 py-1 text-xs bg-accent text-accent-foreground rounded-md"
              >
                Retry
              </button>
            </div>
          ) : (
            <FileTree
              nodes={filteredFileTree}
              onFileSelect={handleFileSelect}
              activePath={activeTab?.path || activePath}
              onContextMenu={handleContextMenu}
              expandedPaths={expandedPaths}
              selectedPaths={selectedPaths}
            />
          )}
        </div>

        {/* File Stats */}
        <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
          {selectedPaths.size > 0 ? (
            <span>{selectedPaths.size} selected</span>
          ) : openTabs.length > 0 ? (
            <span>{openTabs.length} tab{openTabs.length > 1 ? 's' : ''} open</span>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>

      {/* File Viewer Area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        <FileViewerTabs />
        {activeTabId ? (
          <FileViewer tabId={activeTabId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">No file open</p>
              <p className="text-xs">Select a file from the explorer</p>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <FileContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        type={contextMenu.type}
        onClose={closeContextMenu}
        onCreateFile={handleNewFileClick}
        onCreateFolder={handleNewFolderClick}
        onRename={handleRenameClick}
        onDelete={handleDeleteClick}
        onRefresh={handleRefresh}
      />

      {/* New File Dialog */}
      <NewItemDialog
        isOpen={newItemDialog.isOpen && newItemDialog.type === 'file'}
        type="file"
        parentPath={newItemDialog.parentPath}
        onClose={closeNewItemDialog}
        onConfirm={handleCreateFileConfirm}
      />

      {/* New Folder Dialog */}
      <NewItemDialog
        isOpen={newItemDialog.isOpen && newItemDialog.type === 'directory'}
        type="directory"
        parentPath={newItemDialog.parentPath}
        onClose={closeNewItemDialog}
        onConfirm={handleCreateFolderConfirm}
      />

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        path={renameDialog.path}
        currentName={renameDialog.currentName}
        onClose={closeRenameDialog}
        onConfirm={handleRenameConfirm}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        paths={pathsToDelete}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderPlus,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface FileContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'file' | 'directory' | 'root' | null;
  onClose: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function FileContextMenu({
  isOpen,
  x,
  y,
  type,
  onClose,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onRefresh,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  const isFile = type === 'file';
  const isDirectory = type === 'directory';
  const isRoot = type === 'root';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-lg py-1"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* New File/Folder - available for directories and root */}
      {(isDirectory || isRoot) && (
        <>
          <button
            onClick={() => {
              onCreateFile();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
          >
            <FilePlus className="w-4 h-4 text-blue-400" />
            <span>New File</span>
          </button>
          <button
            onClick={() => {
              onCreateFolder();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-yellow-400" />
            <span>New Folder</span>
          </button>
          <div className="my-1 border-t border-border" />
        </>
      )}

      {/* File operations - available for files */}
      {isFile && (
        <>
          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-green-400" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <div className="my-1 border-t border-border" />
        </>
      )}

      {/* Directory operations - available for directories */}
      {isDirectory && (
        <>
          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-green-400" />
            <span>Rename Folder</span>
          </button>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Folder</span>
          </button>
          <div className="my-1 border-t border-border" />
        </>
      )}

      {/* Common operations */}
      <button
        onClick={() => {
          onRefresh();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-accent" />
        <span>Refresh</span>
      </button>
    </div>
  );
}

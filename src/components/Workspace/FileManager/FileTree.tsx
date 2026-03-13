import { useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
} from 'lucide-react';
import { useFileStore, type FileNode } from '@/stores/fileStore';

interface FileTreeProps {
  nodes: FileNode[];
  level?: number;
  onFileSelect: (path: string) => void;
  activePath?: string | null;
  onContextMenu?: (e: React.MouseEvent, path: string, type: 'file' | 'directory') => void;
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
}

export function FileTree({
  nodes,
  level = 0,
  onFileSelect,
  activePath,
  onContextMenu,
  expandedPaths,
  selectedPaths,
}: FileTreeProps) {
  const { toggleDirectory } = useFileStore();

  const handleClick = useCallback(
    async (node: FileNode) => {
      if (node.isDir) {
        await toggleDirectory(node.path);
      } else {
        onFileSelect(node.path);
      }
    },
    [toggleDirectory, onFileSelect]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.path, node.isDir ? 'directory' : 'file');
    },
    [onContextMenu]
  );

  const getFileIcon = (name: string, isDir: boolean, isExpanded: boolean) => {
    if (isDir) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-yellow-500" />
      ) : (
        <Folder className="w-4 h-4 text-yellow-500" />
      );
    }

    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
      case 'jsx':
      case 'js':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-yellow-300" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const isActive = activePath === node.path;
        const isExpanded = expandedPaths.has(node.path);
        const isSelected = selectedPaths.has(node.path);

        return (
          <div key={node.path}>
            <div
              className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md cursor-pointer ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : isSelected
                    ? 'bg-accent/20'
                    : 'hover:bg-secondary text-foreground'
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => handleClick(node)}
              onContextMenu={(e) => handleContextMenu(e, node)}
            >
              {node.isDir ? (
                isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5" />
              )}
              {getFileIcon(node.name, node.isDir, isExpanded)}
              <span className="flex-1 truncate select-none">{node.name}</span>
            </div>

            {node.isDir && isExpanded && node.children && (
              <FileTree
                nodes={node.children}
                level={level + 1}
                onFileSelect={onFileSelect}
                activePath={activePath}
                onContextMenu={onContextMenu}
                expandedPaths={expandedPaths}
                selectedPaths={selectedPaths}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

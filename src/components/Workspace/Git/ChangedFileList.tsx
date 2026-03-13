import { File, FilePlus, FileMinus, FileEdit } from 'lucide-react';

interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'staged';
}

interface ChangedFileListProps {
  files: ChangedFile[];
  title: string;
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  isStaged?: boolean;
}

export function ChangedFileList({
  files,
  title,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  isStaged = false,
}: ChangedFileListProps) {
  if (files.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
      case 'staged':
        return <FilePlus className="w-4 h-4 text-green-500" />;
      case 'deleted':
        return <FileMinus className="w-4 h-4 text-red-500" />;
      case 'modified':
        return <FileEdit className="w-4 h-4 text-yellow-500" />;
      case 'untracked':
        return <File className="w-4 h-4 text-gray-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'added':
        return 'A';
      case 'deleted':
        return 'D';
      case 'modified':
        return 'M';
      case 'untracked':
        return '?';
      case 'staged':
        return 'S';
      default:
        return '-';
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 py-2 bg-muted">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        {isStaged ? (
          onUnstageAll && (
            <button
              onClick={onUnstageAll}
              className="text-xs text-accent hover:underline"
            >
              Unstage all
            </button>
          )
        ) : (
          onStageAll && (
            <button
              onClick={onStageAll}
              className="text-xs text-accent hover:underline"
            >
              Stage all
            </button>
          )
        )}
      </div>

      <div className="divide-y divide-border">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 group"
          >
            <span className="w-4 text-xs font-mono text-muted-foreground">
              {getStatusLabel(file.status)}
            </span>
            {getStatusIcon(file.status)}
            <span className="flex-1 text-sm truncate">{file.path}</span>
            {isStaged ? (
              onUnstage && (
                <button
                  onClick={() => onUnstage(file.path)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-accent px-2 py-1 rounded hover:bg-secondary"
                >
                  −
                </button>
              )
            ) : (
              onStage && (
                <button
                  onClick={() => onStage(file.path)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-accent px-2 py-1 rounded hover:bg-secondary"
                >
                  +
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { File, Plus, Minus, Eye, X, Undo2 } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import { useProjectStore } from '@/stores/projectStore';
import * as ipc from '@/lib/ipc';

interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'conflicted';
  staged: boolean;
}

export function StagingArea() {
  const { activeProject } = useProjectStore();
  const gitStore = useGitStore();
  const [viewingDiff, setViewingDiff] = useState<{ path: string; diff: string } | null>(null);

  const gitState = gitStore.gitState;

  if (!gitState) return null;

  // Build file lists from gitState
  const staged: FileChange[] = gitState.staged.map((path) => ({
    path,
    status: 'modified',
    staged: true,
  }));

  const unstaged: FileChange[] = [
    ...gitState.modified.map((path) => ({ path, status: 'modified' as const, staged: false })),
    ...gitState.untracked.map((path) => ({ path, status: 'untracked' as const, staged: false })),
    ...gitState.conflicted.map((path) => ({ path, status: 'conflicted' as const, staged: false })),
  ];

  const handleStage = useCallback(async (files: string[]) => {
    await gitStore.stageFiles(files);
  }, [gitStore]);

  const handleUnstage = useCallback(async (files: string[]) => {
    await gitStore.unstageFiles(files);
  }, [gitStore]);

  const handleStageAll = useCallback(async () => {
    await gitStore.stageAll();
  }, [gitStore]);

  const handleUnstageAll = useCallback(async () => {
    await gitStore.unstageAll();
  }, [gitStore]);

  const handleViewDiff = useCallback(async (path: string) => {
    if (!activeProject) return;
    try {
      const result = await ipc.getGitDiff(activeProject.path, path);
      setViewingDiff({ path, diff: result.diff });
    } catch (error) {
      console.error('Failed to get diff:', error);
    }
  }, [activeProject]);

  const handleResetFile = useCallback(async (path: string) => {
    const confirmed = window.confirm(`Reset changes in "${path}"?\n\nThis will discard all local changes to this file.`);
    if (confirmed) {
      await gitStore.resetFile(path);
    }
  }, [gitStore]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified':
        return <span className="text-yellow-500 font-mono text-xs">M</span>;
      case 'added':
        return <span className="text-green-500 font-mono text-xs">A</span>;
      case 'deleted':
        return <span className="text-red-500 font-mono text-xs">D</span>;
      case 'untracked':
        return <span className="text-gray-500 font-mono text-xs">?</span>;
      case 'conflicted':
        return <span className="text-red-400 font-mono text-xs font-bold">!</span>;
      default:
        return <span>-</span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified':
        return 'text-yellow-500';
      case 'added':
        return 'text-green-500';
      case 'deleted':
        return 'text-red-500';
      case 'untracked':
        return 'text-gray-500';
      case 'conflicted':
        return 'text-red-400';
      default:
        return '';
    }
  };

  const renderFileList = (files: FileChange[], title: string, isStaged: boolean) => (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        {files.length > 0 && (
          <button
            onClick={() => (isStaged ? handleUnstageAll() : handleStageAll())}
            disabled={gitStore.isLoading}
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            {isStaged ? 'Unstage all' : 'Stage all'}
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {files.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted-foreground text-center">
            No {isStaged ? 'staged' : 'unstaged'} changes
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 group ${
                file.status === 'conflicted' ? 'bg-red-500/5' : ''
              }`}
            >
              <button
                onClick={() => (isStaged ? handleUnstage([file.path]) : handleStage([file.path]))}
                disabled={gitStore.isLoading}
                className="p-1 rounded hover:bg-muted disabled:opacity-50"
                title={isStaged ? 'Unstage' : 'Stage'}
              >
                {isStaged ? (
                  <Minus className="w-3 h-3 text-red-400" />
                ) : (
                  <Plus className="w-3 h-3 text-green-400" />
                )}
              </button>
              <span className={`w-4 text-xs font-mono ${getStatusColor(file.status)}`}>
                {getStatusIcon(file.status)}
              </span>
              <File className="w-4 h-4 text-muted-foreground" />
              <span
                className={`flex-1 text-sm truncate ${
                  file.status === 'conflicted' ? 'text-red-400 font-medium' : ''
                }`}
              >
                {file.path}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleViewDiff(file.path)}
                  className="p-1 rounded hover:bg-muted"
                  title="View diff"
                >
                  <Eye className="w-3 h-3" />
                </button>
                {!isStaged && file.status !== 'untracked' && (
                  <button
                    onClick={() => handleResetFile(file.path)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                    title="Discard changes"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const handleDiscardAll = useCallback(async () => {
    const confirmed = window.confirm(
      'Discard ALL local changes?\n\nThis will reset all modified files and remove all untracked files. This action cannot be undone.'
    );
    if (confirmed) {
      await gitStore.resetAll();
    }
  }, [gitStore]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {renderFileList(staged, 'Staged Changes', true)}
        {renderFileList(unstaged, 'Changes', false)}

        {/* Discard All */}
        {unstaged.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={handleDiscardAll}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md border border-red-500/20 w-full justify-center"
            >
              <Undo2 className="w-3 h-3" />
              Discard All Changes
            </button>
          </div>
        )}
      </div>

      {/* Diff Viewer Modal */}
      {viewingDiff && (
        <div className="fixed inset-0 dialog-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-medium truncate">{viewingDiff.path}</h3>
              <button
                onClick={() => setViewingDiff(null)}
                className="p-1 rounded hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted">
              <pre className="font-mono text-sm whitespace-pre-wrap">
                {viewingDiff.diff || 'No diff available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

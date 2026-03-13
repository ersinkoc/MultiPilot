import { useState, useCallback } from 'react';
import { GitCommit, GitBranch, AlertCircle, Loader2, Archive, ArchiveRestore } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

export function CommitBox() {
  const gitStore = useGitStore();
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gitState = gitStore.gitState;
  const canCommit = gitState?.staged.length && gitState.staged.length > 0;

  const handleCommit = useCallback(async () => {
    if (!message.trim() || !canCommit) return;

    setIsCommitting(true);
    setError(null);
    try {
      const success = await gitStore.commit(message.trim());
      if (success) {
        setMessage('');
      } else {
        setError('Failed to commit');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsCommitting(false);
    }
  }, [message, canCommit, gitStore]);

  const handleStashPush = useCallback(() => {
    gitStore.openStashDialog('push');
  }, [gitStore]);

  const handleStashPop = useCallback(() => {
    gitStore.openStashDialog('pop');
  }, [gitStore]);

  // Keyboard shortcut for Ctrl+Enter to commit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canCommit) {
      handleCommit();
    }
  }, [handleCommit, canCommit]);

  return (
    <div className="p-4 border-t border-border bg-card">
      {error && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="w-3 h-3" />
            <span>Branch: {gitState?.branch || gitStore.currentBranch || 'main'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStashPush}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Stash changes"
            >
              <Archive className="w-3 h-3" />
              Stash
            </button>
            {gitStore.stashList.length > 0 && (
              <button
                onClick={handleStashPop}
                className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded transition-colors"
                title="Pop stash"
              >
                <ArchiveRestore className="w-3 h-3" />
                Pop ({gitStore.stashList.length})
              </button>
            )}
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canCommit ? "Commit message... (Ctrl+Enter to commit)" : "Stage files to commit..."}
          disabled={!canCommit}
          className="w-full h-20 px-3 py-2 text-sm bg-muted rounded-md border border-border resize-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {gitState?.staged?.length ? (
              <span className="text-green-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {gitState.staged.length} file{gitState.staged.length > 1 ? 's' : ''} staged
              </span>
            ) : (
              <span>No files staged</span>
            )}
          </div>

          <button
            onClick={handleCommit}
            disabled={!message.trim() || !canCommit || isCommitting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {isCommitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitCommit className="w-4 h-4" />
            )}
            Commit
          </button>
        </div>
      </div>
    </div>
  );
}

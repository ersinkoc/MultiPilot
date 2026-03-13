import { useEffect } from 'react';
import { GitCommit, User, Clock, RefreshCw } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useGitStore } from '@/stores/gitStore';

export function CommitHistory() {
  const { activeProject } = useProjectStore();
  const gitStore = useGitStore();

  useEffect(() => {
    if (activeProject?.isGitRepo) {
      gitStore.loadCommits(20);
    }
  }, [activeProject?.id, gitStore.loadCommits]);

  if (!activeProject?.isGitRepo) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Not a git repository
      </div>
    );
  }

  const commits = gitStore.commits;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Commits
        </span>
        <button
          onClick={() => gitStore.loadCommits(20)}
          disabled={gitStore.commitsLoading}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
          title="Refresh commits"
        >
          <RefreshCw className={`w-4 h-4 ${gitStore.commitsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Commit List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {gitStore.commitsLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading commits...
              </div>
            ) : (
              'No commits found'
            )}
          </div>
        ) : (
          commits.map((commit) => (
            <div
              key={commit.hash}
              className="px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <GitCommit className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {commit.message.split('\n')[0]}
                  </div>

                  {commit.message.includes('\n') && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {commit.message.split('\n').slice(1).join('\n').trim()}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono text-accent">{commit.hash.slice(0, 7)}</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(commit.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60000) {
      return 'just now';
    }
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Format as date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

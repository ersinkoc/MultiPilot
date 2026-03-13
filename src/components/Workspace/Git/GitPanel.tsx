import { useEffect, useState, useCallback } from 'react';
import {
  GitBranch,
  RefreshCw,
  GitPullRequest,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useGitStore } from '@/stores/gitStore';
import { BranchSelector } from './BranchSelector';
import { StagingArea } from './StagingArea';
import { CommitBox } from './CommitBox';
import { CommitHistory } from './CommitHistory';
import { BranchDialog } from './BranchDialog';
import { StashDialog } from './StashDialog';
import * as ipc from '@/lib/ipc';

export function GitPanel() {
  const { activeProject, updateProjectGit } = useProjectStore();
  const gitStore = useGitStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'changes' | 'history' | 'branches'>('changes');

  const refreshGitStatus = useCallback(async () => {
    if (!activeProject?.isGitRepo) return;
    setIsLoading(true);
    try {
      const status = await ipc.gitStatus(activeProject.path);
      updateProjectGit(activeProject.id, { ...status, commits: [] });
      await gitStore.loadGitStatus(activeProject.path);
    } catch (error) {
      console.error('Failed to refresh git status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject, updateProjectGit, gitStore]);

  useEffect(() => {
    refreshGitStatus();
  }, [refreshGitStatus]);

  const handlePush = useCallback(async () => {
    setIsLoading(true);
    try {
      await gitStore.push();
    } finally {
      setIsLoading(false);
    }
  }, [gitStore]);

  const handlePull = useCallback(async () => {
    setIsLoading(true);
    try {
      await gitStore.pull();
    } finally {
      setIsLoading(false);
    }
  }, [gitStore]);

  const handleFetch = useCallback(async () => {
    setIsLoading(true);
    try {
      await gitStore.fetch();
    } finally {
      setIsLoading(false);
    }
  }, [gitStore]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <GitBranch className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
        <h3 className="text-sm font-medium mb-1">No Project Selected</h3>
        <p className="text-xs text-muted-foreground">Select a project to view Git information.</p>
      </div>
    );
  }

  if (!activeProject.isGitRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <GitBranch className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
        <h3 className="text-sm font-medium mb-1">Not a Git Repository</h3>
        <p className="text-xs text-muted-foreground max-w-md">
          This project is not initialized as a Git repository.
        </p>
      </div>
    );
  }

  const gitState = gitStore.gitState;
  const hasChanges = gitState && (
    gitState.modified.length > 0 ||
    gitState.staged.length > 0 ||
    gitState.untracked.length > 0
  );
  const hasConflicts = gitState?.conflicted && gitState.conflicted.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <BranchSelector />
          {gitState?.tracking && (
            <div className="flex items-center gap-2 text-xs">
              {gitState.ahead > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <ArrowUp className="w-3 h-3" />
                  {gitState.ahead}
                </span>
              )}
              {gitState.behind > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <ArrowDown className="w-3 h-3" />
                  {gitState.behind}
                </span>
              )}
            </div>
          )}
          {hasConflicts && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              Conflicts
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFetch}
            disabled={isLoading}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Fetch"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePull}
            disabled={isLoading}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Pull"
          >
            <GitPullRequest className="w-4 h-4" />
          </button>
          <button
            onClick={handlePush}
            disabled={isLoading || (gitState?.ahead === 0)}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Push"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={refreshGitStatus}
            disabled={isLoading}
            className={`p-2 rounded-md hover:bg-secondary ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
        {[
          {
            id: 'changes' as const,
            label: 'Changes',
            badge: hasChanges
              ? (gitState?.modified.length || 0) +
                (gitState?.staged.length || 0) +
                (gitState?.untracked.length || 0)
              : undefined,
          },
          { id: 'history' as const, label: 'History' },
          {
            id: 'branches' as const,
            label: 'Branches',
            badge: gitStore.branches.length || undefined,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            {tab.badge ? (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-background rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'changes' && (
          <div className="h-full flex flex-col">
            {hasConflicts && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Resolve conflicts before committing</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <StagingArea />
            </div>
            <CommitBox />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto">
            <CommitHistory />
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Local Branches
              </div>
              {gitStore.branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches found</p>
              ) : (
                gitStore.branches.map((branch) => (
                  <div
                    key={branch}
                    onClick={() => {
                      if (branch !== gitStore.currentBranch) {
                        gitStore.checkout(branch);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer ${
                      gitStore.currentBranch === branch
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <GitBranch className="w-4 h-4" />
                    {branch}
                    {gitStore.currentBranch === branch && (
                      <span className="ml-auto text-xs text-accent">current</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <BranchDialog
        isOpen={gitStore.branchDialog.isOpen}
        mode={gitStore.branchDialog.mode}
        onClose={gitStore.closeBranchDialog}
      />

      <StashDialog
        isOpen={gitStore.stashDialog.isOpen}
        mode={gitStore.stashDialog.mode}
        onClose={gitStore.closeStashDialog}
      />
    </div>
  );
}

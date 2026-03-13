import { useState } from 'react';
import { GitBranch, Check, ChevronDown, Plus, GitCommit, GitMerge } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

export function BranchSelector() {
  const gitStore = useGitStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentBranch = gitStore.currentBranch || gitStore.gitState?.branch || 'main';
  const branches = gitStore.branches;

  const handleCreateBranch = () => {
    setIsOpen(false);
    gitStore.openBranchDialog('create');
  };

  const handleCheckoutBranch = () => {
    setIsOpen(false);
    gitStore.openBranchDialog('checkout');
  };

  const handleMergeBranch = () => {
    setIsOpen(false);
    gitStore.openBranchDialog('merge');
  };

  const handleSwitchBranch = async (branch: string) => {
    setIsOpen(false);
    if (branch !== currentBranch) {
      await gitStore.checkout(branch);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
      >
        <GitBranch className="w-4 h-4" />
        <span className="max-w-[100px] truncate">{currentBranch}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-md shadow-lg z-50">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search branches..."
                className="w-full px-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              <div className="px-3 py-1 text-xs text-muted-foreground uppercase tracking-wider">
                Local Branches ({branches.length})
              </div>
              {branches.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No branches found
                </div>
              ) : (
                branches.map((branch) => (
                  <button
                    key={branch}
                    onClick={() => handleSwitchBranch(branch)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                      currentBranch === branch ? 'text-accent bg-accent/5' : ''
                    }`}
                  >
                    {currentBranch === branch ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-4" />
                    )}
                    <GitBranch className="w-4 h-4" />
                    <span className="truncate">{branch}</span>
                  </button>
                ))
              )}
            </div>

            <div className="p-2 border-t border-border space-y-1">
              <button
                onClick={handleCreateBranch}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create new branch
              </button>
              <button
                onClick={handleCheckoutBranch}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <GitCommit className="w-4 h-4" />
                Switch branch...
              </button>
              <button
                onClick={handleMergeBranch}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <GitMerge className="w-4 h-4" />
                Merge branch...
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { GitBranch, X, AlertCircle, Loader2, GitMerge, GitCommit } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

interface BranchDialogProps {
  isOpen: boolean;
  mode: 'create' | 'checkout' | 'merge';
  onClose: () => void;
}

export function BranchDialog({ isOpen, mode, onClose }: BranchDialogProps) {
  const [branchName, setBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [checkoutAfterCreate, setCheckoutAfterCreate] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const { branches, currentBranch, createBranch, checkout, mergeBranch } = useGitStore();

  useEffect(() => {
    if (isOpen) {
      setBranchName('');
      setError(null);
      setIsProcessing(false);
      setSelectedBranch('');
      setCheckoutAfterCreate(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'create') {
      if (!branchName.trim()) {
        setError('Branch name is required');
        return;
      }

      setIsProcessing(true);
      try {
        const success = await createBranch(branchName.trim(), checkoutAfterCreate);
        if (success) {
          onClose();
        } else {
          setError('Failed to create branch');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProcessing(false);
      }
    } else if (mode === 'checkout') {
      if (!selectedBranch) {
        setError('Please select a branch');
        return;
      }

      setIsProcessing(true);
      try {
        const success = await checkout(selectedBranch);
        if (success) {
          onClose();
        } else {
          setError('Failed to checkout branch');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProcessing(false);
      }
    } else if (mode === 'merge') {
      if (!selectedBranch) {
        setError('Please select a branch to merge');
        return;
      }

      setIsProcessing(true);
      try {
        const success = await mergeBranch(selectedBranch);
        if (success) {
          onClose();
        } else {
          setError('Failed to merge branch. There may be conflicts.');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create Branch';
      case 'checkout':
        return 'Switch Branch';
      case 'merge':
        return 'Merge Branch';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'create':
        return <GitBranch className="w-5 h-5 text-accent" />;
      case 'checkout':
        return <GitCommit className="w-5 h-5 text-accent" />;
      case 'merge':
        return <GitMerge className="w-5 h-5 text-accent" />;
    }
  };

  const otherBranches = branches.filter((b) => b !== currentBranch);

  return (
    <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
      <div className="dialog-content bg-card rounded-lg w-full max-w-md mx-4 shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{getTitle()}</h2>
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{currentBranch}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'create' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Branch Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="feature/new-feature"
                  className={`w-full px-3 py-2 bg-muted rounded-md border focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-border focus:ring-accent'
                  }`}
                  autoComplete="off"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkoutAfterCreate}
                  onChange={(e) => setCheckoutAfterCreate(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <span className="text-sm">Checkout after create</span>
              </label>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                {mode === 'checkout' ? 'Select Branch' : 'Branch to Merge'}
              </label>
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-md divide-y divide-border">
                {otherBranches.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No other branches available
                  </div>
                ) : (
                  otherBranches.map((branch) => (
                    <label
                      key={branch}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted transition-colors ${
                        selectedBranch === branch ? 'bg-accent/10' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="branch"
                        value={branch}
                        checked={selectedBranch === branch}
                        onChange={(e) => {
                          setSelectedBranch(e.target.value);
                          setError(null);
                        }}
                        className="w-4 h-4"
                      />
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{branch}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isProcessing ||
                (mode === 'create' ? !branchName.trim() : !selectedBranch)
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' && 'Create'}
              {mode === 'checkout' && 'Switch'}
              {mode === 'merge' && 'Merge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

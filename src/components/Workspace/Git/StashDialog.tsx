import { useState, useEffect, useRef } from 'react';
import { Archive, X, AlertCircle, Loader2, ArchiveRestore, Trash2, Copy } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

interface StashDialogProps {
  isOpen: boolean;
  mode: 'push' | 'pop';
  onClose: () => void;
}

export function StashDialog({ isOpen, mode, onClose }: StashDialogProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { stash, stashPop, stashApply, stashDrop, stashList, loadStashList } = useGitStore();

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setError(null);
      setIsProcessing(false);
      loadStashList();
      if (mode === 'push') {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, mode, loadStashList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'push') {
      setIsProcessing(true);
      try {
        const success = await stash(message.trim() || undefined);
        if (success) {
          onClose();
        } else {
          setError('Failed to stash changes');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProcessing(false);
      }
    } else if (mode === 'pop') {
      setIsProcessing(true);
      try {
        const success = await stashPop(0);
        if (success) {
          onClose();
        } else {
          setError('Failed to pop stash. There may be conflicts.');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleApply = async (index: number) => {
    setError(null);
    setIsProcessing(true);
    try {
      const success = await stashApply(index);
      if (!success) {
        setError('Failed to apply stash');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (index: number) => {
    if (!confirm(`Drop stash@{${index}}? This cannot be undone.`)) return;
    setError(null);
    setIsProcessing(true);
    try {
      const success = await stashDrop(index);
      if (!success) {
        setError('Failed to drop stash');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    return mode === 'push' ? 'Stash Changes' : 'Stash Manager';
  };

  const getIcon = () => {
    return mode === 'push' ? (
      <Archive className="w-5 h-5 text-accent" />
    ) : (
      <ArchiveRestore className="w-5 h-5 text-accent" />
    );
  };

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
                {mode === 'push'
                  ? 'Save your changes for later'
                  : `${stashList.length} stash${stashList.length !== 1 ? 'es' : ''} available`}
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
          {mode === 'push' ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Stash Message (optional)
              </label>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="WIP: working on feature..."
                className={`w-full px-3 py-2 bg-muted rounded-md border focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-border focus:ring-accent'
                }`}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for automatic message
              </p>
            </div>
          ) : (
            <div>
              {stashList.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {stashList.map((stashMsg, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border group"
                    >
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {index}
                      </span>
                      <span className="text-sm flex-1 truncate">{stashMsg}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApply(index)}
                          disabled={isProcessing}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Apply (keep stash)"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDrop(index)}
                          disabled={isProcessing}
                          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                          title="Drop stash"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-yellow-500 text-center py-4">No stashes available</p>
              )}
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
              {mode === 'pop' ? 'Close' : 'Cancel'}
            </button>
            {mode === 'push' && (
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Stash
              </button>
            )}
            {mode === 'pop' && stashList.length > 0 && (
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Pop Latest
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

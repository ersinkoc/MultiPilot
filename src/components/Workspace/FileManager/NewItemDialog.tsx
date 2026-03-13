import { useState, useEffect, useRef } from 'react';
import { FilePlus, FolderPlus, X, AlertCircle } from 'lucide-react';

interface NewItemDialogProps {
  isOpen: boolean;
  type: 'file' | 'directory';
  parentPath: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function NewItemDialog({
  isOpen,
  type,
  parentPath,
  onClose,
  onConfirm,
}: NewItemDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      // Focus input after dialog opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate name (no special characters that could be path traversal)
    if (name.includes('/') || name.includes('\\')) {
      setError('Name cannot contain path separators');
      return;
    }

    if (name === '.' || name === '..') {
      setError('Invalid name');
      return;
    }

    onConfirm(name.trim());
    setName('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const Icon = type === 'file' ? FilePlus : FolderPlus;
  const title = type === 'file' ? 'New File' : 'New Folder';
  const placeholder = type === 'file' ? 'filename.ts' : 'foldername';

  return (
    <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
      <div className="dialog-content bg-card rounded-lg w-full max-w-md mx-4 shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                in {parentPath.split(/[/\\]/).pop() || parentPath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-3 py-2 bg-muted rounded-md border focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-border focus:ring-accent'
              }`}
              autoComplete="off"
            />
            {error && (
              <div className="flex items-center gap-1 mt-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Bot, Check, Terminal, Sparkles, ChevronRight } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import type { DiscoveredCli } from '@/lib/types';

interface DiscoveredCliImportProps {
  discoveredClis: DiscoveredCli[];
  onClose: () => void;
}

export function DiscoveredCliImport({ discoveredClis, onClose }: DiscoveredCliImportProps) {
  const { importDiscoveredCli } = useProfileStore();
  const [selectedClis, setSelectedClis] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<string[]>([]);

  const toggleCli = (command: string) => {
    const newSelected = new Set(selectedClis);
    if (newSelected.has(command)) {
      newSelected.delete(command);
    } else {
      newSelected.add(command);
    }
    setSelectedClis(newSelected);
  };

  const handleImport = async () => {
    if (selectedClis.size === 0) return;

    setImporting(true);
    const importedIds: string[] = [];

    for (const command of selectedClis) {
      const cli = discoveredClis.find((c) => c.command === command);
      if (cli) {
        const profile = importDiscoveredCli(cli, {
          importEnvVars: true,
          importSettings: true,
        });
        importedIds.push(profile.id);
      }
    }

    setImported(importedIds);
    setImporting(false);

    // Close after a short delay
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Get icon and color based on CLI name
  const getCliIcon = (command: string): { icon: string; color: string } => {
    switch (command) {
      case 'claude':
        return { icon: 'Bot', color: '#d97757' };
      case 'codex':
        return { icon: 'Code', color: '#10a37f' };
      case 'gemini':
        return { icon: 'Sparkles', color: '#4285f4' };
      case 'aider':
        return { icon: 'GitBranch', color: '#c4902c' };
      default:
        return { icon: 'Bot', color: '#3b82f6' };
    }
  };

  if (discoveredClis.length === 0) {
    return (
      <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
        <div className="bg-card rounded-lg w-full max-w-lg mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">No CLIs Found</h2>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-muted-foreground">
            No supported CLI tools were found in your PATH. Make sure you have
            claude, codex, gemini, or aider installed and available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 dialog-backdrop flex items-center justify-center z-50">
      <div className="bg-card rounded-lg w-full max-w-xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Import CLI Tools</h2>
              <p className="text-sm text-muted-foreground">
                {discoveredClis.length} tool{discoveredClis.length > 1 ? 's' : ''} discovered
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CLI List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {discoveredClis.map((cli) => {
            const { color } = getCliIcon(cli.command);
            const isSelected = selectedClis.has(cli.command);
            const isImported = imported.some(id => id.includes(cli.command));

            return (
              <button
                key={cli.command}
                onClick={() => !isImported && toggleCli(cli.command)}
                disabled={isImported}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  isImported
                    ? 'border-green-500/50 bg-green-500/10'
                    : isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <Bot className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">{cli.name}</span>
                    {cli.version && (
                      <span className="text-xs text-muted-foreground">
                        v{cli.version}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Terminal className="w-3 h-3" />
                    <code className="truncate">{cli.detectedPath}</code>
                  </div>
                </div>

                <div className="shrink-0">
                  {isImported ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  ) : isSelected ? (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-5 h-5 text-accent-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/50">
          <div className="text-sm text-muted-foreground">
            {imported.length > 0 ? (
              <span className="text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {imported.length} profile{imported.length > 1 ? 's' : ''} imported
              </span>
            ) : (
              <span>
                {selectedClis.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedClis.size === 0 || importing || imported.length > 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              {importing ? (
                <>Importing...</>
              ) : (
                <>
                  Import Selected
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

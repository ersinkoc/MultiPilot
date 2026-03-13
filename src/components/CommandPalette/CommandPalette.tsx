import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Command,
  Search,
  X,
  CornerDownLeft,
  FileText,
  Bot,
  Settings,
  GitBranch,
  LayoutDashboard,
} from 'lucide-react';
import { useCommandStore } from '@/stores/commandStore';
import type { Command as CommandType } from '@/lib/types';

const iconMap: Record<string, typeof Command> = {
  Command,
  FileText,
  Bot,
  Settings,
  GitBranch,
  LayoutDashboard,
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { commands, recentCommands, searchCommands, executeCommand } = useCommandStore();

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all available commands
      const recent = recentCommands
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is CommandType => !!c);
      const others = commands.filter((c) => !recentCommands.includes(c.id));
      return [...recent, ...others];
    }
    return searchCommands(query);
  }, [query, commands, recentCommands, searchCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          const command = filteredCommands[selectedIndex];
          if (command) {
            executeCommand(command.id);
            onClose();
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          setQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] dialog-backdrop">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded">
            <CornerDownLeft className="w-3 h-3" />
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Command className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No commands found</p>
              {query && (
                <p className="text-sm mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <div className="py-2">
              {/* Group by category when no search */}
              {!query && renderGroupedCommands(filteredCommands, selectedIndex, executeCommand, onClose, setQuery)}
              {/* Flat list when searching */}
              {query && renderFlatCommands(filteredCommands, selectedIndex, executeCommand, onClose, setQuery)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
              to select
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}

function renderGroupedCommands(
  commands: CommandType[],
  selectedIndex: number,
  executeCommand: (id: string) => boolean,
  onClose: () => void,
  setQuery: (q: string) => void
) {
  const grouped = commands.reduce((acc, cmd) => {
    acc[cmd.category] = acc[cmd.category] || [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandType[]>);

  let globalIndex = 0;

  return Object.entries(grouped).map(([category, categoryCommands]) => (
    <div key={category}>
      <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {category}
      </div>
      {categoryCommands.map((command) => {
        const index = globalIndex++;
        const isSelected = index === selectedIndex;

        return (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={isSelected}
            onClick={() => {
              executeCommand(command.id);
              onClose();
              setQuery('');
            }}
          />
        );
      })}
    </div>
  ));
}

function renderFlatCommands(
  commands: CommandType[],
  selectedIndex: number,
  executeCommand: (id: string) => boolean,
  onClose: () => void,
  setQuery: (q: string) => void
) {
  return commands.map((command, index) => {
    const isSelected = index === selectedIndex;

    return (
      <CommandItem
        key={command.id}
        command={command}
        isSelected={isSelected}
        onClick={() => {
          executeCommand(command.id);
          onClose();
          setQuery('');
        }}
      />
    );
  });
}

interface CommandItemProps {
  command: CommandType;
  isSelected: boolean;
  onClick: () => void;
}

function CommandItem({ command, isSelected, onClick }: CommandItemProps) {
  const Icon = command.icon ? iconMap[command.icon] || Command : Command;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{command.name}</div>
        <div className={`text-xs ${isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
          {command.description}
        </div>
      </div>
      {command.shortcut && (
        <kbd className={`hidden sm:block px-2 py-1 text-xs rounded ${
          isSelected ? 'bg-accent-foreground/20' : 'bg-muted'
        }`}>
          {command.shortcut}
        </kbd>
      )}
    </button>
  );
}

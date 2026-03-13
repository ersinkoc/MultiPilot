import { create } from 'zustand';
import type { Command } from '@/lib/types';
import { useAgentStore } from './agentStore';
import { useProjectStore } from './projectStore';

interface CommandState {
  commands: Command[];
  recentCommands: string[];
  isCommandPaletteOpen: boolean;

  // Actions
  registerCommand: (command: Command) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  addToRecent: (commandId: string) => void;
  clearRecent: () => void;

  // Getters
  getAvailableCommands: () => Command[];
  getCommandsByCategory: (category: string) => Command[];
  searchCommands: (query: string) => Command[];
}

export const useCommandStore = create<CommandState>()((set, get) => ({
  commands: [],
  recentCommands: [],
  isCommandPaletteOpen: false,

  registerCommand: (command) => {
    set((state) => ({
      commands: [...state.commands.filter((c) => c.id !== command.id), command],
    }));
  },

  unregisterCommand: (id) => {
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    }));
  },

  executeCommand: (id) => {
    const command = get().commands.find((c) => c.id === id);
    if (!command) return false;

    if (command.isEnabled && !command.isEnabled()) {
      return false;
    }

    try {
      command.action();
      get().addToRecent(id);
      return true;
    } catch (error) {
      console.error(`Failed to execute command ${id}:`, error);
      return false;
    }
  },

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  addToRecent: (commandId) => {
    set((state) => ({
      recentCommands: [
        commandId,
        ...state.recentCommands.filter((id) => id !== commandId),
      ].slice(0, 10),
    }));
  },

  clearRecent: () => set({ recentCommands: [] }),

  getAvailableCommands: () => {
    return get().commands.filter((c) => !c.isEnabled || c.isEnabled());
  },

  getCommandsByCategory: (category) => {
    return get()
      .getAvailableCommands()
      .filter((c) => c.category === category);
  },

  searchCommands: (query) => {
    const lowerQuery = query.toLowerCase();
    return get()
      .getAvailableCommands()
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          (c.shortcut && c.shortcut.toLowerCase().includes(lowerQuery))
      );
  },
}));

// Default commands
export function registerDefaultCommands() {
  const { registerCommand } = useCommandStore.getState();
  const { killAgent } = useAgentStore.getState();

  // Agent commands
  registerCommand({
    id: 'agent.spawn',
    name: 'Spawn New Agent',
    description: 'Create and start a new agent',
    shortcut: 'Ctrl+Shift+N',
    category: 'Agent',
    icon: 'Plus',
    action: () => {
      document.dispatchEvent(new CustomEvent('open-spawn-dialog'));
    },
  });

  registerCommand({
    id: 'agent.kill',
    name: 'Kill Selected Agent',
    description: 'Stop the currently selected agent',
    shortcut: 'Ctrl+Shift+K',
    category: 'Agent',
    icon: 'Square',
    action: () => {
      const { selectedAgentId } = useAgentStore.getState();
      if (selectedAgentId) {
        killAgent(selectedAgentId);
      }
    },
    isEnabled: () => !!useAgentStore.getState().selectedAgentId,
  });

  registerCommand({
    id: 'view.agents',
    name: 'View: Agents',
    description: 'Switch to Agents view',
    shortcut: 'Ctrl+1',
    category: 'View',
    action: () => {
      useProjectStore.getState().setViewMode('agents');
    },
  });

  registerCommand({
    id: 'view.files',
    name: 'View: Files',
    description: 'Switch to Files view',
    shortcut: 'Ctrl+2',
    category: 'View',
    action: () => {
      useProjectStore.getState().setViewMode('files');
    },
  });

  registerCommand({
    id: 'view.git',
    name: 'View: Git',
    description: 'Switch to Git view',
    shortcut: 'Ctrl+3',
    category: 'View',
    action: () => {
      useProjectStore.getState().setViewMode('git');
    },
  });

  registerCommand({
    id: 'file.save',
    name: 'Save File',
    description: 'Save the current file',
    shortcut: 'Ctrl+S',
    category: 'File',
    action: () => {
      document.dispatchEvent(new CustomEvent('save-active-file'));
    },
  });

  registerCommand({
    id: 'dashboard.open',
    name: 'Open Dashboard',
    description: 'Open the global dashboard',
    shortcut: 'Ctrl+Shift+D',
    category: 'View',
    action: () => {
      document.dispatchEvent(new CustomEvent('open-global-dashboard'));
    },
  });

  registerCommand({
    id: 'tasks.open',
    name: 'Open Task Manager',
    description: 'Open the task manager',
    shortcut: 'Ctrl+Shift+T',
    category: 'View',
    action: () => {
      document.dispatchEvent(new CustomEvent('open-task-manager'));
    },
  });
}

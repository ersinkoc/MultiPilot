import { useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { MainArea } from './components/Layout/MainArea';
import { StatusBar } from './components/Layout/StatusBar';
import { ApprovalQueue } from './components/ApprovalQueue/ApprovalQueue';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { NotificationContainer } from './components/Notifications/NotificationContainer';
import { useAgentStore } from './stores/agentStore';
import { useProjectStore } from './stores/projectStore';
import { useProfileStore } from './stores/profileStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useACP } from './hooks/useACP';
import { useCommandStore, registerDefaultCommands } from './stores/commandStore';
import { useLogStore } from './stores/logStore';
import { useNotificationStore } from './stores/notificationStore';
import { applyTheme } from './lib/themes';
import * as ipc from './lib/ipc';
import type { AgentOutputEvent, AgentExitEvent } from './lib/ipc';
import { parseStreamJsonLine, isClaudeCommand } from './lib/streamJsonParser';
import './App.css';

function App() {
  const { loadAgents, addAgentOutput, updateAgentStatus } = useAgentStore();
  const { loadProjects } = useProjectStore();
  const { discoverProfiles, validateAllProfiles } = useProfileStore();
  const { isCommandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useCommandStore();
  const { addInfo, addError } = useLogStore();
  const { info, error } = useNotificationStore();

  // Initialize stores
  useEffect(() => {
    // Register default commands
    registerDefaultCommands();

    // Load data
    loadAgents();
    loadProjects();
    // Apply saved theme or default to dark
    const savedSettings = localStorage.getItem('multipilot-settings');
    const themeId = savedSettings ? (JSON.parse(savedSettings).activeTheme || 'dark') : 'dark';
    applyTheme(themeId);

    // Start sidecar and discover CLIs
    const initApp = async () => {
      // Start sidecar (non-blocking — agents work without it, only git/file ops need it)
      try {
        addInfo('App', 'Starting sidecar...');
        await ipc.startSidecar();
        addInfo('App', 'Sidecar started');
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addError('App', 'Sidecar failed (git/file ops may be limited)', { error: errMsg });
        console.warn('[Sidecar] Failed to start:', errMsg);
      }

      // Discover installed CLI tools (independent of sidecar)
      try {
        addInfo('App', 'Discovering CLI tools...');
        await discoverProfiles();
        addInfo('App', 'CLI discovery complete');
        await validateAllProfiles();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addError('App', 'CLI discovery failed', { error: errMsg });
        error('Discovery Error', errMsg);
      }
    };

    initApp();

    // Listen for agent output events from Rust backend
    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    ipc.onAgentOutput((event: AgentOutputEvent) => {
      // Skip sidecar internal output (not a real agent)
      if (event.agentId === '_sidecar') return;

      // For stdout from Claude agents, parse stream-json
      if (event.stream === 'stdout') {
        const agent = useAgentStore.getState().agents.find(a => a.id === event.agentId);
        const profile = agent ? useProfileStore.getState().getProfileById(agent.profileId) : null;

        if (profile && isClaudeCommand(profile.acpCommand)) {
          const parsed = parseStreamJsonLine(event.line);
          if (parsed) {
            for (const line of parsed.displayLines) {
              if (line) addAgentOutput(event.agentId, line);
            }
            // Add structured update if present
            if (parsed.update) {
              const { addAgentUpdate } = useAgentStore.getState();
              addAgentUpdate(event.agentId, {
                id: `update-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: parsed.update.type,
                content: parsed.update.content,
                toolName: parsed.update.toolName,
                timestamp: Date.now(),
              });
            }
            // Update status if input is requested
            if (parsed.isInputRequest) {
              updateAgentStatus(event.agentId, 'waiting_input');
            }
            return;
          }
          // If parsing failed, still show the raw line (might be non-JSON stderr mixed in)
        }
      }
      // Default: show raw line
      addAgentOutput(event.agentId, event.line);
    }).then(fn => { unlistenOutput = fn; });

    ipc.onAgentExit((event: AgentExitEvent) => {
      if (event.agentId === '_sidecar') return;
      updateAgentStatus(event.agentId, 'exited');
      const exitMsg = `Agent ${event.agentId} exited (code: ${event.exitCode ?? 'unknown'})`;
      addInfo('App', exitMsg);
      info('Agent Exited', exitMsg);

      // Auto-refresh git and file status after agent exits
      const project = useProjectStore.getState().activeProject;
      if (project) {
        import('./stores/fileStore').then(({ useFileStore }) => {
          useFileStore.getState().refreshFileTree();
        });
        import('./stores/gitStore').then(({ useGitStore }) => {
          useGitStore.getState().loadGitStatus(project.path);
        });
      }
    }).then(fn => { unlistenExit = fn; });

    // Log startup
    addInfo('App', 'MultiPilot initialized');
    info('Welcome to MultiPilot', 'Your AI agent management system is ready');

    // Handle command palette shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unlistenOutput?.();
      unlistenExit?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts();
  useACP();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <MainArea />
      <ApprovalQueue />
      <StatusBar />

      {/* Global Components */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />
      <NotificationContainer />
    </div>
  );
}

export default App;

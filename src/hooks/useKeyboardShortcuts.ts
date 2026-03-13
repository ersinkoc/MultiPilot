import { useEffect, useCallback } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { useProjectStore } from '@/stores/projectStore';
import { useFileStore } from '@/stores/fileStore';
import { useApprovalStore } from '@/stores/approvalStore';

export function useKeyboardShortcuts() {
  const { selectedAgentId, killAgent } = useAgentStore();
  const { setViewMode } = useProjectStore();
  const { activeTabId, closeTab } = useFileStore();
  const { queue, approve, reject } = useApprovalStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Spawn new agent: Ctrl/Cmd + Shift + N
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('open-spawn-dialog'));
    }

    // Kill selected agent: Ctrl/Cmd + Shift + K
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'K') {
      event.preventDefault();
      if (selectedAgentId) {
        killAgent(selectedAgentId);
      }
    }

    // Open Global Dashboard: Ctrl/Cmd + Shift + D
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('open-global-dashboard'));
    }

    // Open Task Manager: Ctrl/Cmd + Shift + T
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('open-task-manager'));
    }

    // Approve first pending request: Ctrl/Cmd + Shift + A
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      if (queue.length > 0) {
        approve(queue[0].id, 'Approved via keyboard shortcut');
      }
    }

    // Reject first pending request: Ctrl/Cmd + Shift + R
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      if (queue.length > 0) {
        reject(queue[0].id, 'Rejected via keyboard shortcut');
      }
    }

    // View mode switching: Ctrl/Cmd + 1-4
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          setViewMode('agents');
          break;
        case '2':
          event.preventDefault();
          setViewMode('files');
          break;
        case '3':
          event.preventDefault();
          setViewMode('git');
          break;
        case '4':
          event.preventDefault();
          setViewMode('settings');
          break;
      }
    }

    // Close active tab: Ctrl/Cmd + W
    if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
      event.preventDefault();
      if (activeTabId) {
        closeTab(activeTabId);
      }
    }

    // Save file: Ctrl/Cmd + S
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('save-active-file'));
    }

    // Focus message input in maximized agent: Ctrl/Cmd + Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('focus-agent-input'));
    }

    // Escape to close modals
    if (event.key === 'Escape') {
      document.dispatchEvent(new CustomEvent('close-modals'));
    }
  }, [killAgent, selectedAgentId, setViewMode, queue, approve, reject, activeTabId, closeTab]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return shortcuts reference for UI
  return {
    shortcuts: [
      { key: 'Ctrl/Cmd + Shift + N', description: 'Spawn new agent' },
      { key: 'Ctrl/Cmd + Shift + K', description: 'Kill selected agent' },
      { key: 'Ctrl/Cmd + Shift + D', description: 'Open dashboard' },
      { key: 'Ctrl/Cmd + Shift + T', description: 'Open task manager' },
      { key: 'Ctrl/Cmd + Shift + A', description: 'Approve first request' },
      { key: 'Ctrl/Cmd + Shift + R', description: 'Reject first request' },
      { key: 'Ctrl/Cmd + 1-4', description: 'Switch views' },
      { key: 'Ctrl/Cmd + W', description: 'Close tab' },
      { key: 'Ctrl/Cmd + S', description: 'Save file' },
      { key: 'Escape', description: 'Close modals' },
    ],
  };
}

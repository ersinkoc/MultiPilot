import { useState, useEffect } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { useProjectStore } from '@/stores/projectStore';
import { useApprovalStore } from '@/stores/approvalStore';
import { useActivityStore } from '@/stores/activityStore';
import { useTaskStore } from '@/stores/taskStore';
import { GlobalDashboard } from '@/components/Dashboard/GlobalDashboard';
import { TaskManager } from '@/components/TaskManager/TaskManager';
import {
  Bot,
  GitBranch,
  Circle,
  AlertCircle,
  LayoutDashboard,
  ListTodo,
} from 'lucide-react';

export function StatusBar() {
  const { agents } = useAgentStore();
  const { activeProject } = useProjectStore();
  const { queue } = useApprovalStore();
  const { unreadCount } = useActivityStore();
  const { getActiveTasks } = useTaskStore();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);

  useEffect(() => {
    const handleOpenDashboard = () => setShowDashboard(true);
    const handleOpenTaskManager = () => setShowTaskManager(true);

    document.addEventListener('open-global-dashboard', handleOpenDashboard);
    document.addEventListener('open-task-manager', handleOpenTaskManager);

    return () => {
      document.removeEventListener('open-global-dashboard', handleOpenDashboard);
      document.removeEventListener('open-task-manager', handleOpenTaskManager);
    };
  }, []);

  const runningAgents = agents.filter((a) => a.status === 'running').length;
  const waitingAgents = agents.filter((a) => a.status === 'waiting_input').length;
  const errorAgents = agents.filter((a) => a.status === 'error').length;
  const activeTasks = getActiveTasks().length;

  return (
    <footer className="flex items-center justify-between px-3 h-7 border-t border-border bg-card text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-3">
        {activeProject && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{activeProject.name}</span>
            {activeProject.isGitRepo && activeProject.git && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitBranch className="w-3 h-3" />
                <span>{activeProject.git.branch}</span>
              </div>
            )}
          </div>
        )}

        {activeProject?.git && (
          <div className="flex items-center gap-1.5">
            {activeProject.git.ahead > 0 && (
              <span className="text-blue-400">↑{activeProject.git.ahead}</span>
            )}
            {activeProject.git.behind > 0 && (
              <span className="text-yellow-400">↓{activeProject.git.behind}</span>
            )}
            {(activeProject.git.modified.length > 0 || activeProject.git.staged.length > 0) && (
              <span className="flex items-center gap-0.5">
                <Circle className="w-1.5 h-1.5 fill-current" />
                {activeProject.git.staged.length + activeProject.git.modified.length}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {runningAgents > 0 && (
          <div className="flex items-center gap-1 text-green-500">
            <Bot className="w-3 h-3" />
            <span>{runningAgents}</span>
          </div>
        )}
        {waitingAgents > 0 && (
          <div className="flex items-center gap-1 text-yellow-500">
            <AlertCircle className="w-3 h-3" />
            <span>{waitingAgents}</span>
          </div>
        )}
        {errorAgents > 0 && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-3 h-3" />
            <span>{errorAgents}</span>
          </div>
        )}

        {queue.length > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded-full leading-none">
            {queue.length} pending
          </span>
        )}

        <button
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary transition-colors"
        >
          <LayoutDashboard className="w-3 h-3" />
          {unreadCount > 0 && (
            <span className="px-1 text-[9px] bg-accent text-accent-foreground rounded-full leading-tight">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowTaskManager(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary transition-colors"
        >
          <ListTodo className="w-3 h-3" />
          {activeTasks > 0 && (
            <span className="px-1 text-[9px] bg-yellow-500/20 text-yellow-400 rounded-full leading-tight">
              {activeTasks}
            </span>
          )}
        </button>
      </div>

      {showDashboard && (
        <GlobalDashboard
          isOpen={showDashboard}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showTaskManager && (
        <TaskManager
          isOpen={showTaskManager}
          onClose={() => setShowTaskManager(false)}
        />
      )}
    </footer>
  );
}

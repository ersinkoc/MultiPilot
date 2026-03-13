import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Plus,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { useTaskStore, Task } from '@/stores/taskStore';
import { useAgentStore } from '@/stores/agentStore';
import { PlanViewer } from '@/components/ACP/PlanViewer';
import type { PlanStep } from '@/lib/types';

interface TaskManagerProps {
  agentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskManager({ agentId, isOpen, onClose }: TaskManagerProps) {
  const { tasks, getTasksForAgent, getActiveTasks, createTask } = useTaskStore();
  const { agents } = useAgentStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const displayedTasks = agentId
    ? getTasksForAgent(agentId)
    : filter === 'active'
    ? getActiveTasks()
    : filter === 'completed'
    ? tasks.filter((t) => t.status === 'completed' || t.status === 'failed')
    : tasks;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {agentId ? 'Agent Tasks' : 'Task Manager'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {agentId
                  ? `Tasks for agent: ${agentId}`
                  : `Manage and monitor all agent tasks`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {!agentId && (
          <div className="flex gap-2 mb-6">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {displayedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isExpanded={expandedTask === task.id}
              onToggle={() =>
                setExpandedTask(expandedTask === task.id ? null : task.id)
              }
            />
          ))}
          {displayedTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-accent hover:underline"
              >
                Create your first task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          agentId={agentId}
          agents={agents}
          onClose={() => setShowCreateModal(false)}
          onCreate={(title, description, agentId, steps) => {
            createTask(agentId, title, description, steps);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function TaskItem({
  task,
  isExpanded,
  onToggle,
}: {
  task: Task;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { deleteTask, cancelTask } = useTaskStore();
  const { agents } = useAgentStore();
  const agent = agents.find((a) => a.id === task.agentId);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    running: { icon: Play, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    cancelled: { icon: X, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  };

  const { icon: StatusIcon, color, bg } = statusConfig[task.status];
  const progress = task.steps.length
    ? (task.steps.filter((s) => s.status === 'completed').length / task.steps.length) * 100
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className={`p-2 rounded-lg ${bg}`}>
          <StatusIcon className={`w-5 h-5 ${color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{task.title}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ${bg} ${color}`}
            >
              {task.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{agent?.id || task.agentId}</span>
            <span>·</span>
            <span>
              {task.steps.filter((s) => s.status === 'completed').length}/
              {task.steps.length} steps
            </span>
            <span>·</span>
            <span>{new Date(task.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-32 hidden sm:block">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {task.status === 'running' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelTask(task.id);
              }}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-4">
          {task.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {task.description}
            </p>
          )}
          {task.steps.length > 0 && (
            <PlanViewer steps={task.steps} currentStepIndex={task.currentStepIndex} />
          )}
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({
  agentId,
  agents,
  onClose,
  onCreate,
}: {
  agentId?: string;
  agents: { id: string; status: string }[];
  onClose: () => void;
  onCreate: (
    title: string,
    description: string,
    agentId: string,
    steps: PlanStep[]
  ) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(agentId || '');
  const [stepsInput, setStepsInput] = useState('');

  const runningAgents = agents.filter((a) => a.status === 'running');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedAgent) return;

    const steps: PlanStep[] = stepsInput
      .split('\n')
      .filter((s) => s.trim())
      .map((s, i) => ({
        id: `step_${i}`,
        description: s.trim(),
        status: 'pending',
      }));

    onCreate(title, description, selectedAgent, steps);
  };

  return (
    <div className="fixed inset-0 z-[60] dialog-backdrop flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {!agentId && (
            <div>
              <label className="block text-sm font-medium mb-2">Assign to Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">Select an agent...</option>
                {runningAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.id}
                  </option>
                ))}
              </select>
              {runningAgents.length === 0 && (
                <p className="text-xs text-red-400 mt-1">
                  No running agents available. Start an agent first.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Steps (one per line)
            </label>
            <textarea
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              placeholder="Step 1&#10;Step 2&#10;Step 3..."
              rows={4}
              className="w-full px-3 py-2 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !selectedAgent}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

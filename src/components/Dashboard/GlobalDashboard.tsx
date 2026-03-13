import { useState, useEffect } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Terminal,
  GitBranch,
  FileCode,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useTaskStore, type Task } from '@/stores/taskStore';
import { useActivityStore, type Activity as ActivityItem, type ActivityType } from '@/stores/activityStore';
import { useProjectStore } from '@/stores/projectStore';
import { useApprovalStore } from '@/stores/approvalStore';
import { PlanViewer } from '@/components/ACP/PlanViewer';
import type { AgentInstance, AgentStatus } from '@/lib/types';

const activityIcons: Record<ActivityType, typeof Activity> = {
  agent_spawned: Bot,
  agent_killed: X,
  agent_restarted: RefreshCw,
  agent_status_changed: Activity,
  task_created: Zap,
  task_completed: CheckCircle2,
  task_failed: AlertCircle,
  permission_requested: AlertCircle,
  permission_approved: CheckCircle2,
  permission_rejected: X,
  tool_executed: Terminal,
  file_changed: FileCode,
  git_commit: GitBranch,
  git_push: GitBranch,
  git_pull: GitBranch,
  message_sent: Activity,
  error: AlertCircle,
};

const activityColors: Record<ActivityType, string> = {
  agent_spawned: 'text-green-400',
  agent_killed: 'text-red-400',
  agent_restarted: 'text-blue-400',
  agent_status_changed: 'text-muted-foreground',
  task_created: 'text-yellow-400',
  task_completed: 'text-green-400',
  task_failed: 'text-red-400',
  permission_requested: 'text-yellow-400',
  permission_approved: 'text-green-400',
  permission_rejected: 'text-red-400',
  tool_executed: 'text-blue-400',
  file_changed: 'text-purple-400',
  git_commit: 'text-orange-400',
  git_push: 'text-green-400',
  git_pull: 'text-blue-400',
  message_sent: 'text-muted-foreground',
  error: 'text-red-400',
};

interface GlobalDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalDashboard({ isOpen, onClose }: GlobalDashboardProps) {
  const { agents } = useAgentStore();
  const { getActiveTasks, tasks } = useTaskStore();
  const { activities, unreadCount, markAllAsRead } = useActivityStore();
  const { projects } = useProjectStore();
  const { queue } = useApprovalStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'activity'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Stats
  const activeAgents = agents.filter((a) => a.status === 'running').length;
  const activeTasksCount = getActiveTasks().length;
  const pendingApprovals = queue.length;
  const totalProjects = projects.length;

  // Agent status distribution
  const statusCounts = agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1;
    return acc;
  }, {} as Record<AgentStatus, number>);

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="min-h-screen p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Agents, tasks, and activity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard
            icon={Bot}
            label="Active Agents"
            value={activeAgents}
            total={agents.length}
            color="text-green-400"
          />
          <StatCard
            icon={Zap}
            label="Active Tasks"
            value={activeTasksCount}
            total={tasks.length}
            color="text-yellow-400"
          />
          <StatCard
            icon={AlertCircle}
            label="Pending Approvals"
            value={pendingApprovals}
            color="text-orange-400"
          />
          <StatCard
            icon={GitBranch}
            label="Projects"
            value={totalProjects}
            color="text-blue-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {(['overview', 'tasks', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'activity' && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                  {unreadCount}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Agent Status Overview */}
                <DashboardSection title="Agent Status" icon={Bot}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {agents.map((agent) => (
                      <AgentStatusCard
                        key={agent.id}
                        agent={agent}
                        isSelected={selectedAgent === agent.id}
                        onClick={() => setSelectedAgent(
                          selectedAgent === agent.id ? null : agent.id
                        )}
                      />
                    ))}
                    {agents.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No agents running. Spawn an agent to get started.
                      </div>
                    )}
                  </div>
                </DashboardSection>

                {/* Recent Tasks */}
                <DashboardSection title="Recent Tasks" icon={Zap}>
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map((task) => (
                      <TaskSummaryCard key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks yet. Create a task to track agent progress.
                      </div>
                    )}
                  </div>
                </DashboardSection>
              </>
            )}

            {activeTab === 'tasks' && (
              <DashboardSection title="All Tasks" icon={Zap}>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskDetailCard key={task.id} task={task} />
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks yet</p>
                    </div>
                  )}
                </div>
              </DashboardSection>
            )}

            {activeTab === 'activity' && (
              <DashboardSection title="Activity Feed" icon={Activity}>
                <div className="space-y-2 max-h-[600px] overflow-auto">
                  {activities.map((activity) => (
                    <ActivityItemComponent key={activity.id} activity={activity} />
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activity yet</p>
                    </div>
                  )}
                </div>
              </DashboardSection>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Agent Details */}
            {selectedAgent && (() => {
              const agent = agents.find((a) => a.id === selectedAgent);
              return agent ? <AgentDetailPanel agent={agent} /> : null;
            })()}

            {/* Pending Approvals */}
            {pendingApprovals > 0 && (
              <DashboardSection title="Pending Approvals" icon={AlertCircle}>
                <div className="space-y-2">
                  {queue.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg bg-muted/50 text-sm"
                    >
                      <div className="font-medium truncate">{req.toolName}</div>
                      <div className="text-xs text-muted-foreground">
                        {req.agentId}
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardSection>
            )}

            {/* Status Legend */}
            <DashboardSection title="Status Reference" icon={Filter}>
              <div className="space-y-2 text-sm">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status as AgentStatus} />
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                    </div>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({
  icon: Icon,
  label,
  value,
  total,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  total?: number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold">{value}</span>
        {total !== undefined && (
          <span className="text-xs text-muted-foreground">/ {total}</span>
        )}
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AgentStatusCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentInstance;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<AgentStatus, string> = {
    starting: 'bg-yellow-500',
    running: 'bg-green-500',
    waiting_input: 'bg-blue-500',
    idle: 'bg-gray-500',
    exited: 'bg-gray-700',
    error: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all ${
        isSelected
          ? 'border-accent bg-accent/10'
          : 'border-border bg-muted/50 hover:bg-muted'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
        <span className="text-sm font-medium truncate">{agent.id}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {agent.updates.length} updates
      </div>
    </button>
  );
}

function AgentDetailPanel({ agent }: { agent: AgentInstance }) {
  const { getTasksForAgent } = useTaskStore();
  const tasks = getTasksForAgent(agent.id);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium truncate">{agent.id}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Status</div>
          <div className="capitalize">{agent.status.replace('_', ' ')}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Project</div>
          <div className="truncate">{agent.projectPath}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Tasks</div>
          <div>{tasks.length} total</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Updates</div>
          <div>{agent.updates.length} received</div>
        </div>
      </div>
    </div>
  );
}

function TaskSummaryCard({ task }: { task: Task }) {
  const statusIcons = {
    pending: Clock,
    running: RefreshCw,
    completed: CheckCircle2,
    failed: AlertCircle,
    cancelled: X,
  };

  const statusColors = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-400',
  };

  const Icon = statusIcons[task.status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className={`w-4 h-4 ${statusColors[task.status]} ${task.status === 'running' ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground">
          {task.steps.filter((s: { status: string }) => s.status === 'completed').length}/{task.steps.length} steps
        </div>
      </div>
    </div>
  );
}

function TaskDetailCard({ task }: { task: Task }) {
  const progress = task.steps.length > 0
    ? (task.steps.filter((s: { status: string }) => s.status === 'completed').length / task.steps.length) * 100
    : 0;

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
          task.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
          task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          {task.status}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
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

      {/* Steps */}
      {task.steps.length > 0 && (
        <div className="mt-3">
          <PlanViewer steps={task.steps} currentStepIndex={task.currentStepIndex} />
        </div>
      )}
    </div>
  );
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
  const Icon = activityIcons[activity.type];
  const color = activityColors[activity.type];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        activity.read ? 'opacity-60' : 'bg-accent/5'
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm">{activity.message}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
          {activity.projectName && (
            <>
              <span>·</span>
              <span>{activity.projectName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    starting: 'bg-yellow-500',
    running: 'bg-green-500',
    waiting_input: 'bg-blue-500',
    idle: 'bg-gray-500',
    exited: 'bg-gray-700',
    error: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };

  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Square, RotateCcw, Maximize2, Terminal, Lock, Send, X, ListTodo, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import type { AgentInstance } from '@/lib/types';
import { useProfileStore } from '@/stores/profileStore';
import { useAgentStore } from '@/stores/agentStore';
import { useTaskStore } from '@/stores/taskStore';
import { TerminalViewer } from '@/components/ACP/TerminalViewer';
import { PlanViewer } from '@/components/ACP/PlanViewer';
import { TaskManager } from '@/components/TaskManager/TaskManager';
import { sendPromptToAgent } from '@/lib/ipc';

interface AgentCardProps {
  agent: AgentInstance;
  viewMode: 'grid' | 'list';
}

function getModeColor(securityLevel?: string): string {
  switch (securityLevel) {
    case 'safe':
      return 'text-green-400';
    case 'cautious':
      return 'text-yellow-400';
    case 'dangerous':
      return 'text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

function getOutputLineClass(line: string): string {
  if (line.startsWith('> ')) return 'text-accent';
  if (line.startsWith('[error]') || line.startsWith('[tool error]')) return 'text-red-400';
  if (line.startsWith('[tool]')) return 'text-blue-400/80';
  if (line.startsWith('[done]') || line.startsWith('[result]') || line.startsWith('[completed]') || line.startsWith('[turn complete]')) return 'text-green-400/70';
  if (line.startsWith('[thinking]')) return 'text-purple-400/70';
  if (line.startsWith('[input needed]')) return 'text-yellow-400 font-medium';
  if (line.startsWith('[Claude]') || line.startsWith('[MultiPilot]')) return 'text-yellow-400/70';
  if (line.startsWith('[')) return 'text-muted-foreground';
  return 'text-foreground/70';
}

export function AgentCard({ agent, viewMode }: AgentCardProps) {
  const profile = useProfileStore((state) => state.getProfileById(agent.profileId));
  const { killAgent, restartAgent, selectedAgentId, selectAgent, addAgentOutput } = useAgentStore();
  const { getTasksForAgent } = useTaskStore();
  const isSelected = selectedAgentId === agent.id;
  const [isMaximized, setIsMaximized] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'updates' | 'plan'>('output');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const color = profile?.color || '#3b82f6';

  // Elapsed time ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (agent.status !== 'running' && agent.status !== 'waiting_input') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [agent.status]);

  const elapsed = useMemo(() => {
    const diff = Math.floor(((agent.status === 'running' || agent.status === 'waiting_input') ? now : agent.updatedAt) - agent.spawnedAt) / 1000;
    if (diff < 0) return '0s';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = Math.floor(diff % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [agent.spawnedAt, agent.updatedAt, agent.status, now]);

  // Get mode info from spawn config
  const selectedModeId = agent.spawnConfig?.modeId;
  const selectedMode = selectedModeId
    ? profile?.modes.find((m) => m.id === selectedModeId)
    : null;

  // Get tasks for this agent
  const agentTasks = getTasksForAgent(agent.id);
  const activeTasks = agentTasks.filter(t => t.status === 'running');
  const currentTask = activeTasks[0];

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [agent.output]);

  const handleKill = () => {
    if (confirm(`Stop agent "${profile?.name || agent.id}"?`)) {
      killAgent(agent.id);
    }
  };

  const handleRestart = async () => {
    if (!profile) return;
    if (!confirm(`Restart agent "${profile.name}"?`)) return;
    try {
      await restartAgent(agent.id);
      // Respawn with same config
      const { spawnAgent } = await import('@/lib/ipc');
      const { useProjectStore } = await import('@/stores/projectStore');
      const { addAgent } = useAgentStore.getState();
      const project = useProjectStore.getState().projects.find(p => p.id === agent.projectId);
      if (project) {
        const newId = `${profile.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        const newAgent = await spawnAgent(
          newId,
          profile,
          project.id,
          project.path,
          agent.spawnConfig || {}
        );
        addAgent(newAgent);
        useProjectStore.getState().addAgentToProject(project.id, newId);
      }
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const msg = messageInput.trim();
    setIsSending(true);
    // Show sent message in output immediately
    addAgentOutput(agent.id, `> ${msg}`);
    setMessageInput('');

    try {
      const result = await sendPromptToAgent(agent.id, msg);
      if (!result.success) {
        addAgentOutput(agent.id, '[Failed to deliver message]');
      }
    } catch (error) {
      addAgentOutput(agent.id, `[Send error: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      setIsSending(false);
    }
  };

  const statusColors: Record<string, string> = {
    starting: 'bg-yellow-500',
    running: 'bg-green-500',
    waiting_input: 'bg-blue-500',
    idle: 'bg-gray-500',
    exited: 'bg-gray-700',
    error: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };

  const isAlive = agent.status === 'running' || agent.status === 'waiting_input';

  if (isMaximized) {
    return (
      <div className="fixed inset-4 z-50 bg-card rounded-lg border border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{profile?.name || agent.id}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${statusColors[agent.status]}`} />
                <span className="capitalize">{agent.status.replace('_', ' ')}</span>
                <span>·</span>
                <span>{elapsed}</span>
                {selectedMode && (
                  <>
                    <span>·</span>
                    <span className={getModeColor(selectedMode.securityLevel)}>
                      {selectedMode.name}
                    </span>
                  </>
                )}
                {agent.spawnConfig?.isolated && (
                  <>
                    <span>·</span>
                    <Lock className="w-3 h-3 text-blue-400" />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeTasks.length > 0 && (
              <button
                onClick={() => setShowTasks(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-yellow-500/20 text-yellow-400"
              >
                <ListTodo className="w-3.5 h-3.5" />
                {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md ${showTerminal ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal
            </button>
            <button onClick={() => setIsMaximized(false)} className="p-1.5 rounded-md hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Progress */}
        {currentTask && (
          <div className="px-4 py-1.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
              <span className="text-xs font-medium">{currentTask.title}</span>
              <span className="text-[10px] text-muted-foreground">
                ({currentTask.steps.filter(s => s.status === 'completed').length}/{currentTask.steps.length})
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${currentTask.steps.length > 0 ? (currentTask.steps.filter(s => s.status === 'completed').length / currentTask.steps.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-4 border-b border-border bg-muted/30">
          {(['output', 'updates', 'plan'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'updates' && agent.updates.length > 0 && (
                <span className="ml-1 px-1 py-0.5 text-[10px] bg-accent text-accent-foreground rounded-full">
                  {agent.updates.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          <div className={`flex-1 overflow-auto p-4 ${showTerminal ? 'border-r border-border' : ''}`}>
            {activeTab === 'output' && (
              <div className="font-mono text-sm space-y-1">
                {agent.output?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    <Terminal className="w-4 h-4 mr-2" />
                    Waiting for output...
                  </div>
                ) : (
                  agent.output?.map((line, i) => (
                    <div key={i} className={getOutputLineClass(line)}>{line}</div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="space-y-3">
                {agent.updates.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    <Activity className="w-4 h-4 mr-2" />
                    No updates yet...
                  </div>
                ) : (
                  agent.updates.map((update) => (
                    <UpdateItem key={update.id} update={update} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'plan' && (
              <div>
                {currentTask ? (
                  <PlanViewer steps={currentTask.steps} currentStepIndex={currentTask.currentStepIndex} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    No active plan
                  </div>
                )}
              </div>
            )}
          </div>

          {showTerminal && (
            <div className="w-1/2 min-w-[400px]">
              <TerminalViewer
                agentId={agent.id}
                output={agent.output}
                onSendCommand={(cmd) => sendPromptToAgent(agent.id, cmd)}
              />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isAlive ? "Send to stdin..." : "Agent not running"}
              disabled={!isAlive}
              className="flex-1 px-3 py-1.5 text-sm bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSending || !messageInput.trim() || !isAlive}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compact card view ──────────────────────────────────────────────
  return (
    <div
      className={`agent-card flex flex-col ${viewMode === 'list' ? 'flex-row items-center gap-3' : ''} ${isSelected ? 'ring-2 ring-accent' : ''}`}
      onClick={() => selectAgent(agent.id)}
    >
      {/* Header row */}
      <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-sm truncate" title={profile?.name || agent.id}>{profile?.name || agent.id}</h3>
            {agent.pendingPermission && <span className="px-1 py-0.5 text-[10px] bg-accent text-accent-foreground rounded">!</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[agent.status]}`} />
            <span className="capitalize">{agent.status.replace('_', ' ')}</span>
            <span>·</span>
            <span>{elapsed}</span>
            {selectedMode && (
              <>
                <span>·</span>
                <span className={getModeColor(selectedMode.securityLevel)}>
                  {selectedMode.name}
                </span>
              </>
            )}
            {agent.spawnConfig?.isolated && <Lock className="w-2.5 h-2.5 text-blue-400" />}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isAlive ? (
            <button onClick={handleKill} className="p-1 rounded-md hover:bg-red-500/20 hover:text-red-500" title="Stop">
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button onClick={handleRestart} className="p-1 rounded-md hover:bg-secondary" title="Restart">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => useAgentStore.getState().removeAgent(agent.id)}
                className="p-1 rounded-md hover:bg-red-500/20 hover:text-red-500"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={() => setIsMaximized(true)} className="p-1 rounded-md hover:bg-secondary" title="Maximize">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <>
          {/* Task Progress Mini */}
          {currentTask && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-accent animate-spin" />
                  <span className="truncate max-w-[180px]">{currentTask.title}</span>
                </div>
                <span className="text-muted-foreground">
                  {currentTask.steps.filter(s => s.status === 'completed').length}/{currentTask.steps.length}
                </span>
              </div>
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${currentTask.steps.length > 0 ? (currentTask.steps.filter(s => s.status === 'completed').length / currentTask.steps.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Output area */}
          <div ref={outputRef} className="mt-2 flex-1 min-h-[80px] max-h-[160px] overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[11px]">
            {agent.output?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <Terminal className="w-3 h-3 mr-1.5" />
                Waiting for output...
              </div>
            ) : (
              <div className="space-y-0.5">
                {agent.output?.slice(-15).map((line, i) => (
                  <div key={i} className={`truncate ${getOutputLineClass(line)}`}>{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isAlive ? "Send to stdin..." : "Not running"}
              disabled={!isAlive}
              className="flex-1 px-2 py-1 text-xs bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSending || !messageInput.trim() || !isAlive}
              className="p-1 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Task Manager Modal */}
      {showTasks && (
        <TaskManager
          agentId={agent.id}
          isOpen={showTasks}
          onClose={() => setShowTasks(false)}
        />
      )}
    </div>
  );
}

// Update Item Component
function UpdateItem({ update }: { update: AgentInstance['updates'][0] }) {
  const getIcon = () => {
    switch (update.type) {
      case 'message':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'tool_start':
        return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />;
      case 'tool_complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'tool_error':
        return <X className="w-3.5 h-3.5 text-red-400" />;
      case 'plan':
        return <ListTodo className="w-3.5 h-3.5 text-purple-400" />;
      case 'thinking':
        return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />;
      case 'output':
        return <Terminal className="w-3.5 h-3.5 text-muted-foreground" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex gap-2 p-2 rounded-lg bg-muted/50">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs">
          {update.type === 'message' && update.content}
          {update.type === 'thinking' && update.content}
          {update.type === 'output' && (
            <pre className="font-mono text-[11px] overflow-x-auto">{update.content}</pre>
          )}
          {update.type === 'tool_start' && (
            <span>
              Executing <span className="font-mono">{update.toolName}</span>
            </span>
          )}
          {update.type === 'tool_complete' && (
            <span>
              Completed <span className="font-mono">{update.toolName}</span>
            </span>
          )}
          {update.type === 'plan' && update.plan && (
            <div className="space-y-1">
              <span className="font-medium">Plan Updated</span>
              <div className="text-[11px] text-muted-foreground">
                {update.plan.length} steps
              </div>
            </div>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {new Date(update.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

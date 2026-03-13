export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export interface GitStatus {
  branch: string;
  tracking: string | null;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface ACPMessage {
  type: string;
  agentId: string;
  payload: unknown;
  timestamp?: number;
  id?: string;
}

// ACP Message Types for agent communication
export type ACPMessageType =
  | 'acp_output'
  | 'acp_message'
  | 'acp_tool_call'
  | 'acp_tool_result'
  | 'acp_permission_request'
  | 'acp_permission_response'
  | 'acp_plan_update'
  | 'acp_task_start'
  | 'acp_task_complete'
  | 'acp_step_complete'
  | 'acp_step_fail'
  | 'acp_status_change'
  | 'acp_error'
  | 'acp_prompt'
  | 'acp_direct_message'
  | 'connected'
  | 'file-change';

// Agent registration info
export interface AgentInfo {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  connectedAt: number;
  lastSeenAt: number;
  metadata?: Record<string, unknown>;
}

// Direct message between agents
export interface DirectMessagePayload {
  targetAgentId: string;
  content: string;
  messageType?: 'request' | 'response' | 'notification';
  correlationId?: string;
}

export interface FileChangeEvent {
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

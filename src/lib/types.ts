export interface AgentProfile {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  provider?: string;
  acpCommand: string;
  acpArgs: string[];
  extraArgs: string[];
  env: Record<string, string>;
  defaultCwd?: string;
  modes: AgentMode[];
  supportsSettingsFile: boolean;
  settingsFilePath?: string;
  supportsPromptInput: boolean;
  promptFlag?: string;
  // Yeni: Detaylı yapılandırma
  version?: string;
  capabilities?: AgentCapabilities;
  customArgs?: Record<string, string[]>;
  // Phase 8: Real CLI Tool Integration
  isAutoDiscovered?: boolean;
  detectedPath?: string;
  settingsContent?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
  isValid?: boolean;
  validationError?: string;
}

export interface AgentCapabilities {
  canEditFiles: boolean;
  canExecuteCommands: boolean;
  canUseGit: boolean;
  canAccessWeb: boolean;
  maxTokens?: number;
  contextWindow?: number;
  supportedModels?: string[];
}

export interface AgentMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  args: string[];
  securityLevel: 'safe' | 'cautious' | 'dangerous' | 'full_auto';
  requiresApproval: boolean;
  autoApproveTools?: string[];
  // Yeni: Mode özel ayarlar
  settings?: Record<string, unknown>;
  env?: Record<string, string>;
}

export type AgentStatus = 'starting' | 'running' | 'waiting_input' | 'idle' | 'exited' | 'error' | 'reconnecting';

export interface AgentInstance {
  id: string;
  profileId: string;
  projectId: string;
  projectPath: string;
  status: AgentStatus;
  sessionId: string | null;
  spawnedAt: number;
  updatedAt: number;
  updates: SessionUpdate[];
  pendingPermission: PermissionRequest | null;
  output: string[];
  outputLineCount: number;
  spawnConfig?: SpawnConfig;
  // Yeni: Detaylı durum bilgisi
  metadata?: AgentMetadata;
  stats?: AgentStats;
  errors: AgentError[];
}

export interface AgentMetadata {
  pid?: number;
  version?: string;
  model?: string;
  workingDirectory?: string;
  startTime?: number;
  endTime?: number;
  exitCode?: number;
}

export interface AgentStats {
  messagesSent?: number;
  messagesReceived?: number;
  toolsExecuted?: number;
  filesModified?: number;
  tokensUsed?: number;
  cost?: number;
}

export interface AgentError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  code?: string;
  fatal: boolean;
}

export interface SpawnConfig {
  modeId?: string;
  initialPrompt?: string;
  settingsFile?: string;
  spawnEnv?: Record<string, string>;
  isolated?: boolean;
  // Phase 8: Enhanced spawn options
  extraSpawnArgs?: string[];
  workingDirectory?: string;
  timeout?: number;
  retryCount?: number;
  autoRestart?: boolean;
  maxRestarts?: number;
}

export type SessionUpdateType =
  | 'message'
  | 'tool_start'
  | 'tool_complete'
  | 'tool_error'
  | 'plan'
  | 'thinking'
  | 'output'
  | 'status_change'
  | 'file_change'
  | 'git_operation'
  | 'error'
  | 'warning'
  | 'info';

export interface SessionUpdate {
  id: string;
  type: SessionUpdateType;
  timestamp: number;
  content?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  toolResult?: unknown;
  plan?: PlanStep[];
  // Yeni: Zenginleştirilmiş update bilgisi
  severity?: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  duration?: number;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  // Yeni: Detaylı step bilgisi
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  result?: unknown;
  error?: string;
  subSteps?: PlanStep[];
  metadata?: Record<string, unknown>;
}

export interface PermissionRequest {
  id: string;
  agentId: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  description: string;
  timestamp: number;
  // Yeni: Detaylı permission bilgisi
  priority?: 'low' | 'normal' | 'high' | 'critical';
  expiresAt?: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  agents: string[];
  git: GitState | null;
  fileTree: FileNode | null;
  isGitRepo: boolean;
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  defaultAgentMode?: string;
  env?: Record<string, string>;
  isolateAgents?: boolean;
  // Yeni: Gelişmiş proje ayarları
  autoSave?: boolean;
  autoCommit?: boolean;
  commitMessageTemplate?: string;
  fileWatchers?: string[];
  ignoredPaths?: string[];
  maxAgents?: number;
  defaultTimeout?: number;
}

export interface GitState {
  branch: string;
  tracking: string | null;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicted: string[];
  commits: CommitInfo[];
  // Yeni: Detaylı git bilgisi
  stashCount?: number;
  lastCommit?: CommitInfo;
  remoteUrl?: string;
  isDirty: boolean;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  // Yeni: Detaylı commit bilgisi
  authorEmail?: string;
  body?: string;
  stats?: {
    additions: number;
    deletions: number;
    files: number;
  };
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
  // Yeni: Dosya metadatası
  modifiedAt?: number;
  createdAt?: number;
  isGitIgnored?: boolean;
  isSymlink?: boolean;
  permissions?: string;
}

export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isModified: boolean;
  isLoading: boolean;
  language?: string;
  isReadOnly?: boolean;
  cursorPosition?: { line: number; column: number };
  scrollPosition?: number;
  lastSavedAt?: number;
  encoding?: string;
}

export type ViewMode = 'agents' | 'files' | 'git' | 'settings' | 'terminal' | 'logs';

export interface SettingsFile {
  id: string;
  name: string;
  path: string;
  profileId: string;
  content: string;
  // Yeni: Settings dosya bilgisi
  format: 'json' | 'yaml' | 'toml';
  schema?: string;
  lastModified?: number;
  isValid: boolean;
  errors?: string[];
}

// Yeni: Log tipi
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  details?: unknown;
  agentId?: string;
  projectId?: string;
}

// Yeni: Command palette tipi
export interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: string;
  icon?: string;
  action: () => void;
  isEnabled?: () => boolean;
}

// Phase 8: Discovered CLI Tool
export interface DiscoveredCli {
  command: string;
  name: string;
  detectedPath: string;
  version?: string;
  isAvailable: boolean;
  suggestedProfile?: Partial<AgentProfile>;
}

// Phase 8: Command Validation Result
export interface CommandValidationResult {
  isValid: boolean;
  path?: string;
  version?: string;
  error?: string;
}


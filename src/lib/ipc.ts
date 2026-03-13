import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { AgentProfile, AgentInstance, GitState, SpawnConfig, AgentMode, DiscoveredCli, CommandValidationResult } from './types';

// Sidecar git status response type (subset of GitState)
interface SidecarGitStatus {
  branch: string;
  tracking: string | null;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicted: string[];
}

let sidecarChild: any = null;

export async function startSidecar(): Promise<void> {
  if (sidecarChild) {
    console.log('[Sidecar] Already running');
    return;
  }

  try {
    // Start sidecar via Rust backend (handles Windows .cmd resolution)
    const pid = await invoke<number>('start_sidecar');
    sidecarChild = { pid };
    console.log('[Sidecar] Spawned with PID:', pid);

    // Wait for sidecar to be ready (health check)
    const maxRetries = 30;
    const retryDelay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://localhost:8765/health', {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          console.log('[Sidecar] Health check passed');
          return;
        }
      } catch {
        // Not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Sidecar failed to start within timeout');
  } catch (error) {
    console.error('[Sidecar] Failed to start:', error);
    throw error;
  }
}

export async function spawnAgent(
  agentId: string,
  profile: AgentProfile,
  projectId: string,
  projectPath: string,
  spawnConfig: SpawnConfig
): Promise<AgentInstance> {
  return invoke('spawn_agent', {
    request: {
      agent_id: agentId,
      profile: {
        id: profile.id,
        name: profile.name,
        icon: profile.icon,
        color: profile.color,
        description: profile.description,
        provider: profile.provider,
        acp_command: profile.acpCommand,
        acp_args: profile.acpArgs,
        extra_args: profile.extraArgs,
        env: profile.env,
        default_cwd: profile.defaultCwd,
        modes: profile.modes.map((m: AgentMode) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          icon: m.icon,
          args: m.args,
          security_level: m.securityLevel,
          requires_approval: m.requiresApproval,
        })),
        supports_settings_file: profile.supportsSettingsFile,
        settings_file_path: profile.settingsFilePath,
        supports_prompt_input: profile.supportsPromptInput,
        prompt_flag: profile.promptFlag,
        is_auto_discovered: profile.isAutoDiscovered || false,
        detected_path: profile.detectedPath,
        version: profile.version,
      },
      project_id: projectId,
      project_path: projectPath,
      initial_prompt: spawnConfig.initialPrompt,
      spawn_config: {
        modeId: spawnConfig.modeId,
        initialPrompt: spawnConfig.initialPrompt,
        settingsFile: spawnConfig.settingsFile,
        spawnEnv: spawnConfig.spawnEnv,
        isolated: spawnConfig.isolated,
        extraSpawnArgs: spawnConfig.extraSpawnArgs,
      },
    },
  });
}

export async function killAgent(agentId: string): Promise<void> {
  return invoke('kill_agent', { agentId });
}

export async function restartAgent(agentId: string): Promise<void> {
  return invoke('restart_agent', { agentId });
}

export async function getAgentStatus(agentId: string): Promise<AgentInstance | null> {
  return invoke('get_agent_status', { agentId });
}

export async function listAgents(): Promise<AgentInstance[]> {
  return invoke('list_agents');
}

// Send text to agent's stdin (for CLI agents like claude, codex, etc.)
export async function sendToAgentStdin(agentId: string, input: string): Promise<void> {
  return invoke('send_to_agent_stdin', { agentId, input });
}

// Agent output event types
export interface AgentOutputEvent {
  agentId: string;
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface AgentExitEvent {
  agentId: string;
  exitCode: number | null;
}

// Listen for agent output events from Rust backend
export function onAgentOutput(callback: (event: AgentOutputEvent) => void): Promise<UnlistenFn> {
  return listen<AgentOutputEvent>('agent-output', (event) => {
    callback(event.payload);
  });
}

// Listen for agent exit events from Rust backend
export function onAgentExit(callback: (event: AgentExitEvent) => void): Promise<UnlistenFn> {
  return listen<AgentExitEvent>('agent-exit', (event) => {
    callback(event.payload);
  });
}

export async function readFile(path: string): Promise<string> {
  return invoke('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  return invoke('list_directory', { path });
}

export async function gitStatus(path: string): Promise<GitState> {
  const status = await sidecarFetch<SidecarGitStatus>(`/git/status?path=${encodeURIComponent(path)}`);
  return {
    ...status,
    commits: [],
    isDirty: status.modified.length > 0 || status.staged.length > 0 || status.untracked.length > 0,
  };
}

export async function gitBranches(path: string): Promise<string[]> {
  const result = await sidecarFetch<{ branches: string[] }>(`/git/branches?path=${encodeURIComponent(path)}`);
  return result.branches;
}

export async function gitCommit(path: string, message: string): Promise<void> {
  await sidecarFetch('/git/commit', 'POST', { path, message });
}

export async function gitCheckout(path: string, branch: string): Promise<void> {
  await sidecarFetch('/git/checkout', 'POST', { path, branch });
}

export async function gitCreateBranch(path: string, branch: string): Promise<void> {
  await sidecarFetch('/git/create-branch', 'POST', { path, branch });
}

export async function gitDeleteBranch(path: string, branch: string): Promise<void> {
  await sidecarFetch('/git/delete-branch', 'POST', { path, branch });
}

export async function gitResetFile(path: string, file: string): Promise<void> {
  await sidecarFetch('/git/reset-file', 'POST', { path, file });
}

export async function gitStagedDiff(path: string): Promise<{ diff: string }> {
  return sidecarFetch(`/git/staged-diff?path=${encodeURIComponent(path)}`);
}

export async function getGitLog(path: string, maxCount: number = 20): Promise<{ commits: any[] }> {
  return sidecarFetch(`/git/log?path=${encodeURIComponent(path)}&maxCount=${maxCount}`);
}

// Sidecar HTTP API
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function sidecarFetch<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: unknown
): Promise<T> {
  const SIDECAR_PORT = 8765;
  const url = `http://localhost:${SIDECAR_PORT}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return response.json();
}

// Send prompt to agent - uses stdin (Rust backend) for CLI agents
export async function sendPromptToAgent(agentId: string, content: string): Promise<{ success: boolean }> {
  try {
    await sendToAgentStdin(agentId, content);
    return { success: true };
  } catch {
    // Fallback to sidecar ACP for agents connected via WebSocket
    return sidecarFetch('/acp/prompt', 'POST', { agentId, content });
  }
}

export async function respondToACPPermission(
  requestId: string,
  approved: boolean,
  reason?: string
): Promise<{ success: boolean }> {
  return sidecarFetch('/acp/permission/respond', 'POST', { requestId, approved, reason });
}

export async function getConnectedACPAgents(): Promise<{ agents: string[] }> {
  return sidecarFetch('/acp/agents');
}

// Git Operations via Sidecar
export async function stageFiles(projectPath: string, files: string[]): Promise<void> {
  await sidecarFetch('/git/stage', 'POST', { path: projectPath, files });
}

export async function unstageFiles(projectPath: string, files: string[]): Promise<void> {
  await sidecarFetch('/git/unstage', 'POST', { path: projectPath, files });
}

export async function gitPush(projectPath: string): Promise<void> {
  await sidecarFetch('/git/push', 'POST', { path: projectPath });
}

export async function gitPull(projectPath: string): Promise<void> {
  await sidecarFetch('/git/pull', 'POST', { path: projectPath });
}

export async function gitFetch(projectPath: string): Promise<void> {
  await sidecarFetch('/git/fetch', 'POST', { path: projectPath });
}

export async function gitStash(projectPath: string, message?: string): Promise<void> {
  await sidecarFetch('/git/stash', 'POST', { path: projectPath, message });
}

export async function gitStashPop(projectPath: string, index?: number): Promise<void> {
  await sidecarFetch('/git/stash-pop', 'POST', { path: projectPath, index });
}

export async function gitMerge(projectPath: string, branch: string): Promise<void> {
  await sidecarFetch('/git/merge', 'POST', { path: projectPath, branch });
}

export async function gitStashApply(projectPath: string, index?: number): Promise<void> {
  await sidecarFetch('/git/stash-apply', 'POST', { path: projectPath, index });
}

export async function gitStashDrop(projectPath: string, index?: number): Promise<void> {
  await sidecarFetch('/git/stash-drop', 'POST', { path: projectPath, index });
}

export async function gitStashList(projectPath: string): Promise<{ stashes: { index: number; message: string }[] }> {
  return sidecarFetch(`/git/stash-list?path=${encodeURIComponent(projectPath)}`);
}

export async function gitResetAll(projectPath: string): Promise<void> {
  await sidecarFetch('/git/reset-all', 'POST', { path: projectPath });
}

export async function getGitDiff(projectPath: string, file?: string): Promise<{ diff: string }> {
  const params = new URLSearchParams({ path: projectPath });
  if (file) params.append('file', file);
  return sidecarFetch(`/git/diff?${params}`);
}

// File Operations via Sidecar
export async function deleteFile(path: string): Promise<void> {
  await sidecarFetch('/files/delete', 'POST', { path });
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  await sidecarFetch('/files/rename', 'POST', { oldPath, newPath });
}

export async function createDirectory(path: string): Promise<void> {
  await sidecarFetch('/files/mkdir', 'POST', { path });
}

// CLI Discovery Commands
export async function discoverClis(): Promise<DiscoveredCli[]> {
  return invoke('discover_clis_cmd');
}

export async function validateCommand(cmd: string): Promise<CommandValidationResult> {
  return invoke('check_command_exists_tauri', { cmd });
}

export async function getCommandVersion(cmd: string): Promise<string> {
  return invoke('get_command_version_tauri', { cmd });
}

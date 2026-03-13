# MultiPilot API Documentation

## Tauri Commands

### Agent Management

#### `spawn_agent`
Spawns a new agent process.

```typescript
interface SpawnAgentRequest {
  agent_id: string;
  profile: AgentProfile;
  project_path: string;
  initial_prompt?: string;
}

const agent = await invoke('spawn_agent', { request });
```

#### `kill_agent`
Terminates a running agent.

```typescript
await invoke('kill_agent', { agentId: string });
```

#### `get_agent_status`
Gets the current status of an agent.

```typescript
const status = await invoke('get_agent_status', { agentId: string });
```

#### `list_agents`
Lists all agents.

```typescript
const agents = await invoke('list_agents');
```

### File Operations

#### `read_file`
Reads a file's contents.

```typescript
const content = await invoke('read_file', { path: string });
```

#### `write_file`
Writes content to a file.

```typescript
await invoke('write_file', { path: string, content: string });
```

#### `list_directory`
Lists files in a directory.

```typescript
const entries = await invoke('list_directory', { path: string });
// Returns: Array<{ name, path, isDir, size }>
```

### Git Operations

#### `git_status`
Gets git status for a repository.

```typescript
const status = await invoke('git_status', { path: string });
```

#### `git_branches`
Lists all branches.

```typescript
const branches = await invoke('git_branches', { path: string });
```

#### `git_commit`
Creates a commit.

```typescript
await invoke('git_commit', { path: string, message: string });
```

#### `git_checkout`
Switches branches.

```typescript
await invoke('git_checkout', { path: string, branch: string });
```

## Sidecar HTTP API

### File Manager Endpoints

#### GET `/files/list`
List directory contents.

```bash
curl "http://localhost:8765/files/list?path=/path/to/dir"
```

#### GET `/files/read`
Read file content.

```bash
curl "http://localhost:8765/files/read?path=/path/to/file"
```

#### POST `/files/write`
Write file content.

```bash
curl -X POST http://localhost:8765/files/write \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/file", "content": "..."}'
```

#### POST `/files/watch`
Watch a directory for changes.

```bash
curl -X POST http://localhost:8765/files/watch \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/dir"}'
```

### Git Manager Endpoints

#### GET `/git/status`
Get git status.

```bash
curl "http://localhost:8765/git/status?path=/path/to/repo"
```

#### GET `/git/branches`
List branches.

```bash
curl "http://localhost:8765/git/branches?path=/path/to/repo"
```

#### GET `/git/commits`
Get commit history.

```bash
curl "http://localhost:8765/git/commits?path=/path/to/repo&count=20"
```

#### GET `/git/diff`
Get diff for file or working directory.

```bash
curl "http://localhost:8765/git/diff?path=/path/to/repo&file=filename"
```

#### POST `/git/commit`
Create a commit.

```bash
curl -X POST http://localhost:8765/git/commit \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/path/to/repo",
    "message": "Commit message",
    "files": ["file1.txt", "file2.txt"]
  }'
```

#### POST `/git/checkout`
Checkout a branch.

```bash
curl -X POST http://localhost:8765/git/checkout \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/repo", "branch": "main"}'
```

## Store APIs

### Agent Store

```typescript
const {
  agents,
  selectedAgentId,
  loadAgents,
  addAgent,
  removeAgent,
  updateAgentStatus,
  selectAgent,
  killAgent,
} = useAgentStore();
```

### Project Store

```typescript
const {
  projects,
  activeProject,
  openTabs,
  activeTabId,
  viewMode,
  addProject,
  removeProject,
  setActiveProject,
  openFile,
  closeTab,
  setViewMode,
} = useProjectStore();
```

### Profile Store

```typescript
const {
  profiles,
  addProfile,
  updateProfile,
  removeProfile,
  getProfileById,
} = useProfileStore();
```

### Approval Store

```typescript
const {
  queue,
  addRequest,
  approve,
  reject,
  getForAgent,
} = useApprovalStore();
```

## Component Props

### AgentCard

```typescript
interface AgentCardProps {
  agent: AgentInstance;
  viewMode: 'grid' | 'list';
}
```

### TerminalViewer

```typescript
interface TerminalViewerProps {
  agentId: string;
  output: string[];
  onSendCommand?: (command: string) => void;
}
```

### DiffViewer

```typescript
interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  filename?: string;
  splitView?: boolean;
}
```

### PlanViewer

```typescript
interface PlanViewerProps {
  steps: PlanStep[];
  currentStepIndex?: number;
}
```

## Custom Events

### Spawn Dialog

```typescript
// Open spawn dialog
document.dispatchEvent(new CustomEvent('open-spawn-dialog'));
```

### Save File

```typescript
// Trigger save for active file
document.dispatchEvent(new CustomEvent('save-active-file'));
```

### Close Modals

```typescript
// Close all open modals
document.dispatchEvent(new CustomEvent('close-modals'));
```

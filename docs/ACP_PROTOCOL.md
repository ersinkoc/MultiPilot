# MultiPilot Agent Communication Protocol (ACP)

ACP is a WebSocket-based protocol for real-time communication between AI agents and the MultiPilot desktop application.

## Overview

ACP enables:
- Real-time agent status monitoring
- Task/plan tracking with progress visualization
- Centralized permission management
- Output streaming from agents
- Activity logging across all agents

## Connection

Agents connect to the sidecar WebSocket server:
```
ws://localhost:8765?agentId=<agent-id>&acp=true
```

## Message Types

### Agent → MultiPilot

#### `output`
Stream output content to the UI.
```json
{
  "type": "output",
  "agentId": "agent-1",
  "payload": {
    "content": "Processing files...",
    "stream": true
  }
}
```

#### `message`
Send a chat message.
```json
{
  "type": "message",
  "agentId": "agent-1",
  "payload": {
    "content": "Task completed successfully!",
    "role": "assistant"
  }
}
```

#### `task_start`
Start a new task with steps.
```json
{
  "type": "task_start",
  "agentId": "agent-1",
  "payload": {
    "taskId": "task-123",
    "title": "Refactor auth module",
    "description": "Update authentication flow",
    "steps": [
      { "id": "1", "description": "Analyze current code", "status": "pending" },
      { "id": "2", "description": "Update auth service", "status": "pending" },
      { "id": "3", "description": "Test changes", "status": "pending" }
    ]
  }
}
```

#### `task_complete`
Mark a task as complete.
```json
{
  "type": "task_complete",
  "agentId": "agent-1",
  "payload": {
    "taskId": "task-123",
    "success": true
  }
}
```

#### `step_complete`
Mark a step as completed.
```json
{
  "type": "step_complete",
  "agentId": "agent-1",
  "payload": {
    "taskId": "task-123",
    "stepId": "1"
  }
}
```

#### `step_fail`
Mark a step as failed.
```json
{
  "type": "step_fail",
  "agentId": "agent-1",
  "payload": {
    "taskId": "task-123",
    "stepId": "2"
  }
}
```

#### `plan_update`
Update the execution plan.
```json
{
  "type": "plan_update",
  "agentId": "agent-1",
  "payload": {
    "taskId": "task-123",
    "steps": [
      { "id": "1", "description": "Analyze current code", "status": "completed" },
      { "id": "2", "description": "Update auth service", "status": "in_progress" },
      { "id": "3", "description": "Test changes", "status": "pending" }
    ]
  }
}
```

#### `tool_call`
Report tool execution.
```json
{
  "type": "tool_call",
  "agentId": "agent-1",
  "payload": {
    "toolName": "edit_file",
    "toolParams": { "path": "src/auth.ts" },
    "requestId": "req-456"
  }
}
```

#### `tool_result`
Report tool execution result.
```json
{
  "type": "tool_result",
  "agentId": "agent-1",
  "payload": {
    "requestId": "req-456",
    "result": { "success": true },
    "error": null
  }
}
```

#### `permission_request`
Request user approval for an action.
```json
{
  "type": "permission_request",
  "agentId": "agent-1",
  "payload": {
    "requestId": "perm-789",
    "toolName": "edit_file",
    "description": "Edit src/auth.ts (15 changes)",
    "toolParams": { "path": "src/auth.ts", "changes": 15 },
    "timeout": 60000
  }
}
```

#### `status_change`
Report status change.
```json
{
  "type": "status_change",
  "agentId": "agent-1",
  "payload": {
    "status": "running",
    "oldStatus": "idle",
    "message": "Starting task execution"
  }
}
```

#### `error`
Report an error.
```json
{
  "type": "error",
  "agentId": "agent-1",
  "payload": {
    "message": "Failed to read file",
    "stack": "Error: ENOENT...",
    "code": "ENOENT"
  }
}
```

### MultiPilot → Agent

#### `permission_response`
Response to a permission request.
```json
{
  "type": "permission_response",
  "agentId": "agent-1",
  "payload": {
    "requestId": "perm-789",
    "approved": true,
    "reason": "User approved"
  }
}
```

#### `prompt`
User sent a message/prompt.
```json
{
  "type": "prompt",
  "agentId": "agent-1",
  "payload": {
    "content": "Please also update the tests",
    "timestamp": 1700000000000
  }
}
```

#### `interrupt`
User interrupted execution.
```json
{
  "type": "interrupt",
  "agentId": "agent-1",
  "payload": {
    "reason": "User requested stop"
  }
}
```

## SDK Usage

### Installation
```bash
npm install @multipilot/acp-sdk
```

### Basic Integration
```typescript
import { MultiPilotACP } from '@multipilot/acp-sdk';

const acp = new MultiPilotACP({ agentId: 'my-agent' });

// Connect
await acp.connect();

// Report task start
acp.startTask('task-1', 'Refactor auth', 'Update login', [
  { id: '1', description: 'Analyze code', status: 'pending' },
  { id: '2', description: 'Update service', status: 'pending' },
]);

// Stream output
acp.sendOutput('Analyzing authentication flow...');

// Request permission
const approved = await acp.requestPermission(
  'edit_file',
  'Update src/auth.ts',
  { path: 'src/auth.ts' }
);

if (approved) {
  // Execute
  await editFile('src/auth.ts');
  acp.completeStep('task-1', '2');
}

// Complete task
acp.completeTask('task-1', true);
```

## React Integration

The `useACP` hook automatically handles all incoming messages:
```typescript
import { useACP } from '@/hooks/useACP';

function App() {
  const { isConnected } = useACP();
  // Automatically handles permission requests, tasks, output, etc.
}
```

## Security

- Agents must use the `acp=true` query parameter
- Permission requests timeout after 60 seconds by default
- The frontend controls all approvals
- Agents cannot execute tools without approval (unless in dangerous mode)

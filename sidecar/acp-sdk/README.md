# MultiPilot ACP SDK

Agent Communication Protocol SDK for integrating AI agents with MultiPilot.

## Installation

```bash
npm install @multipilot/acp-sdk
```

## Quick Start

```typescript
import { MultiPilotACP } from '@multipilot/acp-sdk';

// Create ACP client
const acp = new MultiPilotACP({
  agentId: 'my-agent-1',
  sidecarUrl: 'ws://localhost:8765', // optional, default
});

// Connect to MultiPilot
await acp.connect();

// Report task start
acp.startTask('task-1', 'Refactor authentication', 'Update login flow', [
  { id: '1', description: 'Analyze current code', status: 'pending' },
  { id: '2', description: 'Update auth service', status: 'pending' },
  { id: '3', description: 'Test changes', status: 'pending' },
]);

// Report progress
acp.completeStep('task-1', '1');
acp.sendOutput('Analyzing authentication flow...');

// Request permission
const approved = await acp.requestPermission(
  'edit_file',
  'Update src/auth.ts',
  { path: 'src/auth.ts', changes: 15 }
);

if (approved) {
  // Execute the tool
  await editFile('src/auth.ts', changes);
  acp.completeStep('task-1', '2');
}

// Complete task
acp.completeTask('task-1', true);
```

## API Reference

### Connection

- `connect()` - Connect to MultiPilot sidecar
- `disconnect()` - Disconnect from sidecar
- `isConnected()` - Check connection status

### Messaging

- `sendMessage(content, role?)` - Send a chat message
- `sendOutput(content, stream?)` - Send output/streaming content
- `reportError(message, stack?, code?)` - Report an error

### Tasks & Plans

- `startTask(taskId, title, description?, steps?)` - Start a new task
- `completeTask(taskId, success?)` - Complete a task
- `completeStep(taskId, stepId)` - Mark a step as complete
- `failStep(taskId, stepId)` - Mark a step as failed
- `updatePlan(steps, taskId?)` - Update execution plan

### Tools & Permissions

- `reportToolCall(toolName, params, requestId?)` - Report tool execution
- `reportToolResult(requestId, result, error?)` - Report tool result
- `requestPermission(toolName, description, params, timeout?)` - Request user approval
- `setPermissionHandler(handler)` - Set automatic permission handler

### Events

- `on(type, handler)` - Listen for events
- `off(type, handler)` - Remove event listener

## Events

Incoming events from MultiPilot:

- `permission_response` - Permission approval/denial
- `prompt` - User sent a prompt/message
- `interrupt` - User interrupted execution
- `config_update` - Configuration changes

## Integration Examples

### With Claude Code

```typescript
import { MultiPilotACP } from '@multipilot/acp-sdk';

const acp = new MultiPilotACP({ agentId: process.env.AGENT_ID || 'claude-1' });

// Connect on startup
await acp.connect();

// Hook into tool execution
const originalExecuteTool = executeTool;
executeTool = async (toolName, params) => {
  // Report tool call
  acp.reportToolCall(toolName, params);

  // Request permission for dangerous tools
  if (isDangerous(toolName)) {
    const approved = await acp.requestPermission(toolName, getDescription(toolName), params);
    if (!approved) throw new Error('Permission denied');
  }

  // Execute tool
  const result = await originalExecuteTool(toolName, params);

  // Report result
  acp.reportToolResult(toolName, result);

  return result;
};
```

### With Custom Agent

```typescript
import { MultiPilotACP } from '@multipilot/acp-sdk';

class MyAgent {
  private acp: MultiPilotACP;

  constructor() {
    this.acp = new MultiPilotACP({ agentId: 'custom-agent' });

    // Listen for prompts
    this.acp.on('prompt', async ({ content }) => {
      await this.handlePrompt(content);
    });
  }

  async start() {
    await this.acp.connect();
    this.acp.reportStatus('idle');
  }

  async handlePrompt(prompt: string) {
    this.acp.reportStatus('running', 'idle');
    this.acp.startTask(Date.now().toString(), 'Process prompt');

    // Process...
    const result = await this.process(prompt);

    this.acp.sendMessage(result);
    this.acp.completeTask(Date.now().toString(), true);
    this.acp.reportStatus('idle', 'running');
  }
}
```

## License

MIT

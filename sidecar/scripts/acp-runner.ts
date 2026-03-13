/**
 * ACP Agent Runner
 *
 * This script wraps AI agent CLIs (Claude, Codex, Gemini, etc.) and
 * exposes them via the Agent Communication Protocol (ACP) over WebSocket.
 *
 * Usage:
 *   npx tsx acp-runner.ts --acp-url ws://localhost:8765/ws \
 *     --agent-id <id> --command <cli> [--arg <arg>...] --working-dir <dir>
 */

import { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';

interface RunnerConfig {
  acpUrl: string;
  agentId: string;
  command: string;
  args: string[];
  workingDir: string;
}

function parseArgs(): RunnerConfig {
  const args = process.argv.slice(2);
  const config: RunnerConfig = {
    acpUrl: '',
    agentId: '',
    command: '',
    args: [],
    workingDir: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--acp-url':
        config.acpUrl = args[++i];
        break;
      case '--agent-id':
        config.agentId = args[++i];
        break;
      case '--command':
        config.command = args[++i];
        break;
      case '--arg':
        config.args.push(args[++i]);
        break;
      case '--working-dir':
        config.workingDir = args[++i];
        break;
    }
  }

  if (!config.acpUrl || !config.agentId || !config.command) {
    console.error('Usage: acp-runner.ts --acp-url <url> --agent-id <id> --command <cmd> [--arg <arg>...]');
    process.exit(1);
  }

  return config;
}

function connectToSidecar(config: RunnerConfig): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wsUrl = `${config.acpUrl}?agentId=${config.agentId}&acp=true`;
    console.error(`[ACP-Runner] Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.error('[ACP-Runner] Connected to sidecar');
      resolve(ws);
    });

    ws.on('error', (err) => {
      console.error('[ACP-Runner] WebSocket error:', err);
      reject(err);
    });

    ws.on('close', () => {
      console.error('[ACP-Runner] WebSocket closed');
      process.exit(0);
    });
  });
}

function spawnAgent(config: RunnerConfig, ws: WebSocket): ChildProcess {
  const isWindows = process.platform === 'win32';

  let cmd: string;
  let cmdArgs: string[];

  if (isWindows) {
    cmd = 'cmd.exe';
    cmdArgs = ['/C', config.command, ...config.args];
  } else {
    cmd = config.command;
    cmdArgs = config.args;
  }

  console.error(`[ACP-Runner] Spawning: ${cmd} ${cmdArgs.join(' ')}`);
  console.error(`[ACP-Runner] Working dir: ${config.workingDir}`);

  const child = spawn(cmd, cmdArgs, {
    cwd: config.workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  return child;
}

function setupOutputForwarding(child: ChildProcess, ws: WebSocket, agentId: string) {
  // Forward stdout to WebSocket
  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      ws.send(JSON.stringify({
        type: 'acp_output',
        agentId,
        timestamp: Date.now(),
        payload: { content: line, stream: true },
      }));
    }
  });

  // Forward stderr to WebSocket
  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      ws.send(JSON.stringify({
        type: 'acp_output',
        agentId,
        timestamp: Date.now(),
        payload: { content: `[stderr] ${line}`, stream: true },
      }));
    }
  });

  // Handle process exit
  child.on('exit', (code) => {
    console.error(`[ACP-Runner] Agent exited with code ${code}`);
    ws.send(JSON.stringify({
      type: 'acp_status_change',
      agentId,
      timestamp: Date.now(),
      payload: { status: 'exited', message: `Exit code: ${code}` },
    }));
    ws.close();
    process.exit(code || 0);
  });

  child.on('error', (err) => {
    console.error('[ACP-Runner] Agent spawn error:', err);
    ws.send(JSON.stringify({
      type: 'acp_error',
      agentId,
      timestamp: Date.now(),
      payload: { message: err.message, code: err.name },
    }));
    ws.close();
    process.exit(1);
  });
}

function setupInputForwarding(child: ChildProcess, ws: WebSocket, agentId: string) {
  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'acp_prompt':
          if (msg.payload?.content && child.stdin?.writable) {
            child.stdin.write(msg.payload.content + '\n');
          }
          break;

        case 'acp_permission_response':
          console.error('[ACP-Runner] Permission response received:', msg.payload);
          break;

        case 'acp_direct_message':
          console.error('[ACP-Runner] Direct message received:', msg.payload);
          break;

        default:
          console.error('[ACP-Runner] Unknown message type:', msg.type);
      }
    } catch (err) {
      console.error('[ACP-Runner] Failed to parse message:', err);
    }
  });
}

async function main() {
  const config = parseArgs();
  const ws = await connectToSidecar(config);

  // Send initial status
  ws.send(JSON.stringify({
    type: 'acp_status_change',
    agentId: config.agentId,
    timestamp: Date.now(),
    payload: { status: 'starting', message: 'Agent process starting...' },
  }));

  // Spawn the agent process
  const child = spawnAgent(config, ws);

  // Set up forwarding
  setupOutputForwarding(child, ws, config.agentId);
  setupInputForwarding(child, ws, config.agentId);

  // Send ready status
  ws.send(JSON.stringify({
    type: 'acp_status_change',
    agentId: config.agentId,
    timestamp: Date.now(),
    payload: { status: 'running', message: 'Agent process running' },
  }));

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[ACP-Runner] Fatal error:', err);
  process.exit(1);
});

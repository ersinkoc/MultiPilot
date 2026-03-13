import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { FileManager } from './FileManager.js';
import { GitManager } from './GitManager.js';
import type { ACPMessage, FileChangeEvent, AgentInfo, DirectMessagePayload } from './types.js';

const PORT = process.env.SIDECAR_PORT || 8765;
const HOST = '127.0.0.1';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const fileManager = new FileManager();
const gitManager = new GitManager();

// Connected clients and agent registry
const clients = new Set<WebSocket>();
const agentRegistry = new Map<string, AgentInfo>();
const wsToAgentMap = new Map<WebSocket, string>();

// Middleware - restrict CORS to localhost origins (Tauri webview + dev server)
app.use(cors({
  origin: [
    'http://localhost:1420',
    'http://127.0.0.1:1420',
    'https://tauri.localhost',
    'tauri://localhost',
  ],
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// File Operations
app.get('/files/list', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const entries = await fileManager.listDirectory(path);
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/files/read', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const content = await fileManager.readFile(path);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/files/write', async (req, res) => {
  try {
    const { path, content } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await fileManager.writeFile(path, content || '');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/files/delete', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await fileManager.deleteFile(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/files/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      res.status(400).json({ error: 'Both oldPath and newPath are required' });
      return;
    }
    await fileManager.renameFile(oldPath, newPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/files/mkdir', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await fileManager.createDirectory(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Git Operations
app.get('/git/status', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const isRepo = await gitManager.isRepo(path);
    if (!isRepo) {
      res.status(400).json({ error: 'Not a git repository' });
      return;
    }
    const status = await gitManager.getStatus(path);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/git/branches', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const branches = await gitManager.getBranches(path);
    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/stage', async (req, res) => {
  try {
    const { path, files } = req.body;
    if (!path || !files) {
      res.status(400).json({ error: 'Path and files are required' });
      return;
    }
    await gitManager.stageFiles(path, files);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/unstage', async (req, res) => {
  try {
    const { path, files } = req.body;
    if (!path || !files) {
      res.status(400).json({ error: 'Path and files are required' });
      return;
    }
    await gitManager.unstageFiles(path, files);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/commit', async (req, res) => {
  try {
    const { path, message } = req.body;
    if (!path || !message) {
      res.status(400).json({ error: 'Path and message are required' });
      return;
    }
    const hash = await gitManager.commit(path, message);
    res.json({ success: true, hash });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/push', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.push(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/pull', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.pull(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/fetch', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.fetch(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/checkout', async (req, res) => {
  try {
    const { path, branch } = req.body;
    if (!path || !branch) {
      res.status(400).json({ error: 'Path and branch are required' });
      return;
    }
    await gitManager.checkout(path, branch);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/create-branch', async (req, res) => {
  try {
    const { path, branch } = req.body;
    if (!path || !branch) {
      res.status(400).json({ error: 'Path and branch are required' });
      return;
    }
    await gitManager.createBranch(path, branch);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/delete-branch', async (req, res) => {
  try {
    const { path, branch, force } = req.body;
    if (!path || !branch) {
      res.status(400).json({ error: 'Path and branch are required' });
      return;
    }
    await gitManager.deleteBranch(path, branch, force);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/reset-file', async (req, res) => {
  try {
    const { path, file } = req.body;
    if (!path || !file) {
      res.status(400).json({ error: 'Path and file are required' });
      return;
    }
    await gitManager.resetFile(path, file);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/git/staged-diff', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const diff = await gitManager.getStagedDiff(path);
    res.json({ diff });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/git/diff', async (req, res) => {
  try {
    const path = req.query.path as string;
    const file = req.query.file as string | undefined;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const diff = await gitManager.getDiff(path, file);
    res.json({ diff });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/git/log', async (req, res) => {
  try {
    const path = req.query.path as string;
    const maxCount = parseInt(req.query.maxCount as string) || 20;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const commits = await gitManager.getLog(path, maxCount);
    res.json({ commits });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/stash', async (req, res) => {
  try {
    const { path, message } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.stash(path, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/stash-pop', async (req, res) => {
  try {
    const { path, index } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.stashPop(path, index);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/merge', async (req, res) => {
  try {
    const { path, branch } = req.body;
    if (!path || !branch) {
      res.status(400).json({ error: 'Path and branch are required' });
      return;
    }
    await gitManager.merge(path, branch);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/stash-apply', async (req, res) => {
  try {
    const { path, index } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.stashApply(path, index);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/stash-drop', async (req, res) => {
  try {
    const { path, index } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.stashDrop(path, index);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/git/stash-list', async (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    const stashes = await gitManager.stashList(path);
    res.json({ stashes });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/git/reset-all', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    await gitManager.resetAll(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ACP (Agent Communication Protocol) HTTP endpoints
app.post('/acp/prompt', async (req, res) => {
  try {
    const { agentId, content } = req.body;
    if (!agentId || !content) {
      res.status(400).json({ error: 'agentId and content are required' });
      return;
    }
    // Broadcast to all clients (agents will pick up their own messages)
    broadcast({
      type: 'acp_prompt',
      agentId,
      payload: { content },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/acp/permission/respond', async (req, res) => {
  try {
    const { requestId, approved, reason } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'requestId is required' });
      return;
    }
    broadcast({
      type: 'acp_permission_response',
      agentId: 'system',
      payload: { requestId, approved, reason },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/acp/agents', (_req, res) => {
  const agents = Array.from(agentRegistry.values()).map(agent => ({
    ...agent,
    isConnected: clients.has(getAgentWebSocket(agent.id) as WebSocket),
  }));
  res.json({ agents });
});

// Direct message to specific agent
app.post('/acp/message', async (req, res) => {
  try {
    const { targetAgentId, content, sourceAgentId, messageType = 'request' } = req.body;
    if (!targetAgentId || !content) {
      res.status(400).json({ error: 'targetAgentId and content are required' });
      return;
    }

    const targetWs = getAgentWebSocket(targetAgentId);
    if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
      res.status(404).json({ error: 'Target agent not found or not connected' });
      return;
    }

    sendToClient(targetWs, {
      type: 'acp_direct_message',
      agentId: sourceAgentId || 'system',
      payload: {
        targetAgentId,
        content,
        messageType,
        correlationId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      } as DirectMessagePayload,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  // Parse query parameters for agent identification
  const url = new URL(req.url || '', 'http://localhost');
  const agentId = url.searchParams.get('agentId') || 'unknown';
  const isAcp = url.searchParams.get('acp') === 'true';

  console.log(`[WebSocket] Client connected: ${agentId} (ACP: ${isAcp})`);
  clients.add(ws);
  wsToAgentMap.set(ws, agentId);

  // Register or update agent in registry
  const now = Date.now();
  if (!agentRegistry.has(agentId)) {
    agentRegistry.set(agentId, {
      id: agentId,
      name: agentId,
      status: 'idle',
      capabilities: [],
      connectedAt: now,
      lastSeenAt: now,
    });
  } else {
    const agent = agentRegistry.get(agentId)!;
    agent.status = 'idle';
    agent.lastSeenAt = now;
  }

  // Set up ping/pong to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('pong', () => {
    // Client is alive, update last seen
    const id = wsToAgentMap.get(ws);
    if (id && agentRegistry.has(id)) {
      agentRegistry.get(id)!.lastSeenAt = Date.now();
    }
  });

  ws.on('message', (data) => {
    try {
      // Reject oversized messages (max 1MB)
      if (data.toString().length > 1_048_576) {
        console.warn('[WebSocket] Rejected oversized message');
        return;
      }
      const message: ACPMessage = JSON.parse(data.toString());

      // Validate required fields
      if (!message.type || typeof message.type !== 'string') {
        console.warn('[WebSocket] Rejected message without valid type');
        return;
      }
      if (!message.agentId || typeof message.agentId !== 'string') {
        console.warn('[WebSocket] Rejected message without valid agentId');
        return;
      }

      // Update agent last seen and status based on message type
      if (agentRegistry.has(message.agentId)) {
        const agent = agentRegistry.get(message.agentId)!;
        agent.lastSeenAt = Date.now();

        // Update status based on message type
        if (message.type === 'acp_task_start') {
          agent.status = 'busy';
        } else if (message.type === 'acp_task_complete') {
          agent.status = 'idle';
        }
      }

      console.log('[WebSocket] Received:', message.type, 'from', message.agentId);

      // Handle targeted messages vs broadcast
      if (isTargetedMessage(message)) {
        routeTargetedMessage(message);
      } else {
        broadcast(message, ws);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${agentId}`);
    clearInterval(pingInterval);
    clients.delete(ws);
    wsToAgentMap.delete(ws);

    // Mark agent as offline
    if (agentRegistry.has(agentId)) {
      agentRegistry.get(agentId)!.status = 'offline';
    }
  });

  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for ${agentId}:`, error);
    clearInterval(pingInterval);
    clients.delete(ws);
    wsToAgentMap.delete(ws);

    // Mark agent as offline
    if (agentRegistry.has(agentId)) {
      agentRegistry.get(agentId)!.status = 'offline';
    }
  });

  // Send welcome message
  sendToClient(ws, {
    type: 'connected',
    agentId: 'system',
    payload: {
      timestamp: Date.now(),
      agentId,
      serverVersion: '0.1.0',
    },
  });
});

// Check if message should be routed to specific target
function isTargetedMessage(message: ACPMessage): boolean {
  // Direct messages to specific agents
  if (message.type === 'acp_direct_message') {
    return true;
  }
  // Permission requests that should only go to UI
  if (message.type === 'acp_permission_request') {
    return true;
  }
  return false;
}

// Route message to specific target
function routeTargetedMessage(message: ACPMessage): void {
  if (message.type === 'acp_direct_message') {
    const payload = message.payload as DirectMessagePayload;
    const targetWs = getAgentWebSocket(payload.targetAgentId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      sendToClient(targetWs, message);
    }
  } else if (message.type === 'acp_permission_request') {
    // Send permission requests to all UI clients (non-ACP clients)
    for (const client of clients) {
      const agentId = wsToAgentMap.get(client);
      // Skip if this is an agent client (typically ACP clients have agent_ prefix)
      if (agentId && !agentId.startsWith('agent_')) {
        sendToClient(client, message);
      }
    }
  }
}

// Get WebSocket for a specific agent
function getAgentWebSocket(agentId: string): WebSocket | undefined {
  for (const [ws, id] of wsToAgentMap.entries()) {
    if (id === agentId && ws.readyState === WebSocket.OPEN) {
      return ws;
    }
  }
  return undefined;
}

// Send message to specific client
function sendToClient(ws: WebSocket, message: ACPMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Broadcast message to all connected clients
function broadcast(message: ACPMessage, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// File change handler
fileManager.setFileChangeHandler((event: FileChangeEvent) => {
  broadcast({
    type: 'file-change',
    agentId: 'system',
    payload: event,
  });
});

// Start server with port conflict handling
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Sidecar] ERROR: Port ${PORT} is already in use.`);
    console.error('[Sidecar] Another sidecar instance may be running, or another application is using this port.');
    console.error('[Sidecar] Set SIDECAR_PORT environment variable to use a different port.');
    process.exit(1);
  } else {
    console.error('[Sidecar] Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT as number, HOST, () => {
  console.log(`[Sidecar] Server running at http://${HOST}:${PORT}`);
  console.log(`[Sidecar] WebSocket available at ws://${HOST}:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Sidecar] Shutting down...');
  fileManager.stopAllWatchers();
  server.close(() => {
    console.log('[Sidecar] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Sidecar] Shutting down...');
  fileManager.stopAllWatchers();
  server.close(() => {
    console.log('[Sidecar] Server closed');
    process.exit(0);
  });
});

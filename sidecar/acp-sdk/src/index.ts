import { WebSocket } from 'ws';

export interface ACPConfig {
  agentId: string;
  sidecarUrl?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export interface ACPMessage {
  id: string;
  type: string;
  agentId: string;
  timestamp: number;
  payload: unknown;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface TaskInfo {
  taskId: string;
  title: string;
  description?: string;
  steps?: PlanStep[];
}

export type PermissionHandler = (request: {
  requestId: string;
  toolName: string;
  description: string;
  toolParams: Record<string, unknown>;
}) => Promise<boolean> | boolean;

export class MultiPilotACP {
  private ws: WebSocket | null = null;
  private config: Required<ACPConfig>;
  private messageHandlers: Map<string, ((payload: unknown) => void)[]> = new Map();
  private permissionHandler: PermissionHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: ACPConfig) {
    this.config = {
      sidecarUrl: 'ws://localhost:8765',
      autoReconnect: true,
      reconnectDelay: 3000,
      ...config,
    };
  }

  /**
   * Connect to the MultiPilot sidecar
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.config.sidecarUrl}?agentId=${this.config.agentId}&acp=true`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log(`[ACP] Connected to MultiPilot as ${this.config.agentId}`);
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('[ACP] Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[ACP] Disconnected from MultiPilot');
        this.handleDisconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[ACP] Connection error:', error);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from the sidecar
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a raw message to the sidecar
   */
  send(type: string, payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ACP] Not connected to sidecar');
      return false;
    }

    const message: ACPMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload,
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send output/streaming content
   */
  sendOutput(content: string, stream = false): boolean {
    return this.send('acp_output', { content, stream });
  }

  /**
   * Send a message
   */
  sendMessage(content: string, role = 'assistant'): boolean {
    return this.send('acp_message', { content, role });
  }

  /**
   * Report tool execution
   */
  reportToolCall(toolName: string, toolParams: Record<string, unknown>, requestId?: string): boolean {
    return this.send('acp_tool_call', { toolName, toolParams, requestId });
  }

  /**
   * Report tool execution result
   */
  reportToolResult(requestId: string, result: unknown, error?: string): boolean {
    return this.send('acp_tool_result', { requestId, result, error });
  }

  /**
   * Request permission for a tool
   */
  async requestPermission(
    toolName: string,
    description: string,
    toolParams: Record<string, unknown>,
    timeout = 60000
  ): Promise<boolean> {
    const requestId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.off('acp_permission_response', handler);
        resolve(false);
      }, timeout);

      // Listen for response
      const handler = (payload: unknown) => {
        const response = payload as { requestId: string; approved: boolean };
        if (response.requestId === requestId) {
          clearTimeout(timeoutHandle);
          this.off('acp_permission_response', handler);
          resolve(response.approved);
        }
      };

      this.on('acp_permission_response', handler);

      // Send request
      this.send('acp_permission_request', {
        requestId,
        toolName,
        description,
        toolParams,
        timeout,
      });
    });
  }

  /**
   * Update execution plan
   */
  updatePlan(steps: PlanStep[], taskId?: string): boolean {
    return this.send('acp_plan_update', { steps, taskId });
  }

  /**
   * Start a new task
   */
  startTask(taskId: string, title: string, description?: string, steps?: PlanStep[]): boolean {
    return this.send('acp_task_start', { taskId, title, description, steps });
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, success = true): boolean {
    return this.send('acp_task_complete', { taskId, success });
  }

  /**
   * Complete a step
   */
  completeStep(taskId: string, stepId: string): boolean {
    return this.send('acp_step_complete', { taskId, stepId });
  }

  /**
   * Fail a step
   */
  failStep(taskId: string, stepId: string): boolean {
    return this.send('acp_step_fail', { taskId, stepId });
  }

  /**
   * Report status change
   */
  reportStatus(status: string, oldStatus?: string, message?: string): boolean {
    return this.send('acp_status_change', { status, oldStatus, message });
  }

  /**
   * Report an error
   */
  reportError(message: string, stack?: string, code?: string): boolean {
    return this.send('acp_error', { message, stack, code });
  }

  /**
   * Register a handler for a message type
   */
  on(type: string, handler: (payload: unknown) => void): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * Remove a handler
   */
  off(type: string, handler: (payload: unknown) => void): void {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(type, handlers);
    }
  }

  /**
   * Set the permission handler
   */
  setPermissionHandler(handler: PermissionHandler): void {
    this.permissionHandler = handler;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: ACPMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach((handler) => handler(message.payload));

    // Handle permission requests internally if handler is set
    if (message.type === 'acp_permission_request' && this.permissionHandler) {
      const payload = message.payload as {
        requestId: string;
        toolName: string;
        description: string;
        toolParams: Record<string, unknown>;
      };

      Promise.resolve(this.permissionHandler(payload)).then((approved) => {
        this.send('acp_permission_response', {
          requestId: payload.requestId,
          approved,
        });
      });
    }
  }

  private handleDisconnect(): void {
    if (this.config.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[ACP] Reconnecting in ${this.config.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnect failed, will try again
        });
      }, this.config.reconnectDelay);
    }
  }
}

// Export default
export default MultiPilotACP;

// Convenience function for quick integration
export function createACP(agentId: string, sidecarUrl?: string): MultiPilotACP {
  return new MultiPilotACP({ agentId, sidecarUrl });
}

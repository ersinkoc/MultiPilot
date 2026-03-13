import { useEffect, useRef, useCallback, useState } from 'react';
import { useApprovalStore } from '@/stores/approvalStore';
import { useAgentStore } from '@/stores/agentStore';
import { useActivityStore } from '@/stores/activityStore';
import { useTaskStore } from '@/stores/taskStore';
import { useProfileStore } from '@/stores/profileStore';
import { useLogStore } from '@/stores/logStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { AgentStatus, PlanStep } from '@/lib/types';

interface ACPMessage {
  type: string;
  agentId: string;
  payload: unknown;
}

export function useACP() {
  const wsRef = useRef<WebSocket | null>(null);
  const hasConnectedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs for all store functions so WebSocket handlers always call latest versions
  const storesRef = useRef({
    addRequest: useApprovalStore.getState().addRequest,
    addAgentUpdate: useAgentStore.getState().addAgentUpdate,
    addAgentOutput: useAgentStore.getState().addAgentOutput,
    updateAgentStatus: useAgentStore.getState().updateAgentStatus,
    addActivity: useActivityStore.getState().addActivity,
    createTask: useTaskStore.getState().createTask,
    completeTask: useTaskStore.getState().completeTask,
    updateSteps: useTaskStore.getState().updateSteps,
    completeStep: useTaskStore.getState().completeStep,
    failStep: useTaskStore.getState().failStep,
    addInfo: useLogStore.getState().addInfo,
    addError: useLogStore.getState().addError,
    info: useNotificationStore.getState().info,
    error: useNotificationStore.getState().error,
    success: useNotificationStore.getState().success,
    warning: useNotificationStore.getState().warning,
  });

  // Keep refs updated
  useEffect(() => {
    // Subscribe to all stores and update refs
    const unsubs = [
      useApprovalStore.subscribe((s) => { storesRef.current.addRequest = s.addRequest; }),
      useAgentStore.subscribe((s) => {
        storesRef.current.addAgentUpdate = s.addAgentUpdate;
        storesRef.current.addAgentOutput = s.addAgentOutput;
        storesRef.current.updateAgentStatus = s.updateAgentStatus;
      }),
      useActivityStore.subscribe((s) => { storesRef.current.addActivity = s.addActivity; }),
      useTaskStore.subscribe((s) => {
        storesRef.current.createTask = s.createTask;
        storesRef.current.completeTask = s.completeTask;
        storesRef.current.updateSteps = s.updateSteps;
        storesRef.current.completeStep = s.completeStep;
        storesRef.current.failStep = s.failStep;
      }),
      useLogStore.subscribe((s) => {
        storesRef.current.addInfo = s.addInfo;
        storesRef.current.addError = s.addError;
      }),
      useNotificationStore.subscribe((s) => {
        storesRef.current.info = s.info;
        storesRef.current.error = s.error;
        storesRef.current.success = s.success;
        storesRef.current.warning = s.warning;
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const getAgentName = useCallback((agentId: string) => {
    const agents = useAgentStore.getState().agents;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return agentId;
    const profile = useProfileStore.getState().getProfileById(agent.profileId);
    return profile?.name || agentId;
  }, []);

  const handleMessage = useCallback((message: ACPMessage) => {
    const s = storesRef.current;
    s.addInfo('ACP', `Received ${message.type}`, { agentId: message.agentId });
    const agentName = getAgentName(message.agentId);

    switch (message.type) {
      case 'acp_permission_request': {
        const payload = message.payload as { id: string; toolName: string; toolParams: Record<string, unknown>; description: string };
        s.addRequest({
          id: payload.id,
          agentId: message.agentId,
          toolName: payload.toolName,
          toolParams: payload.toolParams,
          description: payload.description,
          timestamp: Date.now(),
        });
        s.addActivity({
          type: 'permission_requested',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" requested approval for ${payload.toolName}`,
          details: { toolName: payload.toolName },
        });
        s.info('Permission Request', `"${agentName}" wants to use ${payload.toolName}`);
        break;
      }

      case 'acp_permission_approved': {
        const payload = message.payload as { toolName: string };
        s.addActivity({
          type: 'permission_approved',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" was approved to use ${payload.toolName}`,
          details: { toolName: payload.toolName },
        });
        break;
      }

      case 'acp_permission_rejected': {
        const payload = message.payload as { toolName: string };
        s.addActivity({
          type: 'permission_rejected',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" was denied access to ${payload.toolName}`,
          details: { toolName: payload.toolName },
        });
        break;
      }

      case 'acp_tool_call': {
        const payload = message.payload as { toolName: string; toolParams: Record<string, unknown> };
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'tool_start',
          timestamp: Date.now(),
          toolName: payload.toolName,
          toolParams: payload.toolParams,
        });
        s.addActivity({
          type: 'tool_executed',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" executed ${payload.toolName}`,
          details: payload.toolParams,
        });
        break;
      }

      case 'acp_tool_complete': {
        const payload = message.payload as { toolName: string; result: unknown };
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'tool_complete',
          timestamp: Date.now(),
          toolName: payload.toolName,
          toolResult: payload.result,
        });
        break;
      }

      case 'acp_plan_update': {
        const payload = message.payload as { steps: PlanStep[]; taskId?: string };
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'plan',
          timestamp: Date.now(),
          plan: payload.steps,
        });
        if (payload.taskId) {
          s.updateSteps(payload.taskId, payload.steps);
        }
        break;
      }

      case 'acp_task_start': {
        const payload = message.payload as { taskId: string; title: string; description?: string; steps?: PlanStep[] };
        s.createTask(message.agentId, payload.title, payload.description, payload.steps);
        s.addActivity({
          type: 'task_created',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" started task: ${payload.title}`,
          details: { taskTitle: payload.title },
        });
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'thinking',
          timestamp: Date.now(),
          content: `Starting task: ${payload.title}`,
        });
        break;
      }

      case 'acp_task_complete': {
        const payload = message.payload as { taskId: string; title: string; success?: boolean };
        s.completeTask(payload.taskId, payload.success !== false);
        s.addActivity({
          type: payload.success !== false ? 'task_completed' : 'task_failed',
          agentId: message.agentId,
          agentName,
          message: payload.success !== false
            ? `"${agentName}" completed: ${payload.title}`
            : `"${agentName}" failed: ${payload.title}`,
          details: { taskTitle: payload.title },
        });
        if (payload.success !== false) {
          s.success('Task Completed', `"${payload.title}" completed by ${agentName}`);
        } else {
          s.error('Task Failed', `"${payload.title}" failed in ${agentName}`);
        }
        break;
      }

      case 'acp_step_complete': {
        const payload = message.payload as { taskId: string; stepId: string };
        s.completeStep(payload.taskId, payload.stepId);
        break;
      }

      case 'acp_step_fail': {
        const payload = message.payload as { taskId: string; stepId: string };
        s.failStep(payload.taskId, payload.stepId);
        break;
      }

      case 'acp_status_change': {
        const payload = message.payload as { status: AgentStatus; oldStatus?: AgentStatus };
        s.updateAgentStatus(message.agentId, payload.status);
        s.addActivity({
          type: 'agent_status_changed',
          agentId: message.agentId,
          agentName,
          message: `Agent "${agentName}" status: ${payload.status}`,
          details: { status: payload.status, oldStatus: payload.oldStatus },
        });
        break;
      }

      case 'acp_output': {
        const payload = message.payload as { content: string };
        // Add to both updates (for the updates tab) and output (for the output tab)
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'output',
          timestamp: Date.now(),
          content: payload.content,
        });
        // Also add to raw output so it appears in the output tab
        s.addAgentOutput(message.agentId, payload.content);
        break;
      }

      case 'acp_message': {
        const payload = message.payload as { content: string };
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'message',
          timestamp: Date.now(),
          content: payload.content,
        });
        break;
      }

      case 'file-change': {
        const payload = message.payload as { event: string; path: string };
        s.addActivity({
          type: 'file_changed',
          agentId: message.agentId,
          agentName,
          message: `File ${payload.event}: ${payload.path.split('/').pop()}`,
          details: payload,
        });
        break;
      }

      case 'acp_git_commit': {
        const payload = message.payload as { message: string; hash?: string };
        s.addActivity({
          type: 'git_commit',
          agentId: message.agentId,
          agentName,
          message: `"${agentName}" committed: ${payload.message}`,
          details: payload,
        });
        break;
      }

      case 'acp_error': {
        const payload = message.payload as { message: string; details?: unknown };
        s.addAgentUpdate(message.agentId, {
          id: `update_${Date.now()}`,
          type: 'tool_error',
          timestamp: Date.now(),
          content: payload.message,
        });
        s.addActivity({
          type: 'error',
          agentId: message.agentId,
          agentName,
          message: `Error in "${agentName}": ${payload.message}`,
          details: payload.details,
        });
        s.error('Agent Error', `"${agentName}": ${payload.message}`);
        break;
      }

      case 'connected':
        // Welcome message from sidecar, ignore
        break;

      default:
        s.addInfo('ACP', `Unhandled message type: ${message.type}`, { agentId: message.agentId });
    }
  }, [getAgentName]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    let retryCount = 0;
    const MAX_RETRIES = 30; // Max ~7.5 minutes of retrying

    function connect() {
      const SIDECAR_PORT = 8765;

      try {
        const ws = new WebSocket(`ws://localhost:${SIDECAR_PORT}/ws`);

        ws.onopen = () => {
          retryCount = 0;
          setIsConnected(true);
          storesRef.current.addInfo('ACP', 'Connected to sidecar');
          storesRef.current.success('Connected', 'MultiPilot sidecar is ready');
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          // Only notify on first disconnect, not on every retry
          if (retryCount === 0) {
            storesRef.current.addInfo('ACP', 'Disconnected from sidecar');
          }
          retryCount++;
          // Exponential backoff: 2s, 4s, 8s, max 15s, with max retry limit
          if (retryCount > MAX_RETRIES) {
            storesRef.current.addError('ACP', 'Max reconnection attempts reached', { retryCount });
            return;
          }
          const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 15000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          // Error is followed by close, so we handle retry in onclose
        };

        ws.onmessage = (event) => {
          try {
            const message: ACPMessage = JSON.parse(event.data);
            handleMessage(message);
          } catch (err) {
            storesRef.current.addError('ACP', 'Failed to parse message', { error: String(err) });
          }
        };

        wsRef.current = ws;
      } catch {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          storesRef.current.addError('ACP', 'Max reconnection attempts reached', { retryCount });
          return;
        }
        const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 15000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      // Reset ref to allow reconnection after unmount/remount
      hasConnectedRef.current = false;
    };
  }, [handleMessage]);

  return {
    isConnected,
    sendMessage,
  };
}

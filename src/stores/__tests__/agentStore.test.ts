import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentStore } from '../agentStore';
import type { AgentInstance, AgentStatus, SessionUpdate } from '@/lib/types';

// Mock the IPC module
vi.mock('@/lib/ipc', () => ({
  listAgents: vi.fn().mockResolvedValue([]),
  killAgent: vi.fn().mockResolvedValue(undefined),
  restartAgent: vi.fn().mockResolvedValue(undefined),
  spawnAgent: vi.fn().mockResolvedValue({ id: 'test-agent', status: 'running' }),
}));

describe('agentStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAgentStore.setState({
      agents: [],
      selectedAgentId: null,
      isLoading: false,
      error: null,
    });
  });

  const createMockAgent = (id: string, status: AgentStatus = 'running'): AgentInstance => ({
    id,
    profileId: 'profile-1',
    projectId: 'project-1',
    projectPath: '/test/path',
    status,
    sessionId: null,
    spawnedAt: Date.now(),
    updatedAt: Date.now(),
    updates: [],
    pendingPermission: null,
    output: [],
    outputLineCount: 0,
    errors: [],
    metadata: { pid: 1234 },
  });

  describe('addAgent', () => {
    it('should add a new agent to the store', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);

      const agents = useAgentStore.getState().agents;
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
      expect(agents[0].status).toBe('running');
    });

    it('should initialize agent with empty output and errors', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);

      const agent = useAgentStore.getState().agents[0];
      expect(agent.output).toEqual([]);
      expect(agent.errors).toEqual([]);
    });
  });

  describe('updateAgentStatus', () => {
    it('should update agent status', () => {
      const mockAgent = createMockAgent('agent-1', 'running');

      useAgentStore.getState().addAgent(mockAgent);
      useAgentStore.getState().updateAgentStatus('agent-1', 'idle');

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.status).toBe('idle');
    });

    it('should update agent metadata', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);
      useAgentStore.getState().updateAgentStatus('agent-1', 'running', { model: 'gpt-4' });

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.metadata?.model).toBe('gpt-4');
    });
  });

  describe('addAgentUpdate', () => {
    it('should add an update to agent', () => {
      const mockAgent = createMockAgent('agent-1');

      const update: SessionUpdate = {
        id: 'update-1',
        type: 'thinking',
        timestamp: Date.now(),
        content: 'Test update',
      };

      useAgentStore.getState().addAgent(mockAgent);
      useAgentStore.getState().addAgentUpdate('agent-1', update);

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.updates).toHaveLength(1);
      expect(agent?.updates[0].content).toBe('Test update');
    });

    it('should limit updates to last 100', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);

      // Add 105 updates
      for (let i = 0; i < 105; i++) {
        useAgentStore.getState().addAgentUpdate('agent-1', {
          id: `update-${i}`,
          type: 'thinking',
          timestamp: Date.now(),
          content: `Update ${i}`,
        });
      }

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.updates).toHaveLength(100);
    });
  });

  describe('addAgentOutput', () => {
    it('should add output to agent', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);
      useAgentStore.getState().addAgentOutput('agent-1', 'Test output');

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.output).toContain('Test output');
      expect(agent?.outputLineCount).toBe(1);
    });

    it('should limit output to last 500 lines', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);

      // Add 510 lines of output
      for (let i = 0; i < 510; i++) {
        useAgentStore.getState().addAgentOutput('agent-1', `Line ${i}`);
      }

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.output).toHaveLength(500);
    });
  });

  describe('selectAgent', () => {
    it('should set selected agent', () => {
      useAgentStore.getState().selectAgent('agent-1');
      expect(useAgentStore.getState().selectedAgentId).toBe('agent-1');
    });

    it('should clear selected agent', () => {
      useAgentStore.getState().selectAgent('agent-1');
      useAgentStore.getState().selectAgent(null);
      expect(useAgentStore.getState().selectedAgentId).toBeNull();
    });
  });

  describe('getAgentById', () => {
    it('should return agent by id', () => {
      const mockAgent = createMockAgent('agent-1');

      useAgentStore.getState().addAgent(mockAgent);
      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.id).toBe('agent-1');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = useAgentStore.getState().getAgentById('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getRunningAgents', () => {
    it('should return only running agents', () => {
      useAgentStore.getState().addAgent(createMockAgent('agent-1', 'running'));
      useAgentStore.getState().addAgent(createMockAgent('agent-2', 'idle'));
      useAgentStore.getState().addAgent(createMockAgent('agent-3', 'running'));

      const running = useAgentStore.getState().getRunningAgents();
      expect(running).toHaveLength(2);
      expect(running.map(a => a.id)).toContain('agent-1');
      expect(running.map(a => a.id)).toContain('agent-3');
    });
  });

  describe('getAgentCount', () => {
    it('should return total agent count', () => {
      expect(useAgentStore.getState().getAgentCount()).toBe(0);

      useAgentStore.getState().addAgent(createMockAgent('agent-1'));

      expect(useAgentStore.getState().getAgentCount()).toBe(1);
    });
  });

  describe('clearAgentOutput', () => {
    it('should clear agent output', () => {
      const mockAgent: AgentInstance = {
        ...createMockAgent('agent-1'),
        output: ['line1', 'line2', 'line3'],
        outputLineCount: 3,
      };

      useAgentStore.getState().addAgent(mockAgent);
      useAgentStore.getState().clearAgentOutput('agent-1');

      const agent = useAgentStore.getState().getAgentById('agent-1');
      expect(agent?.output).toHaveLength(0);
      expect(agent?.outputLineCount).toBe(0);
    });
  });
});

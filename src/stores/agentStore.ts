import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentInstance, AgentStatus, SessionUpdate, PermissionRequest, AgentError, AgentStats, AgentMetadata } from '@/lib/types';
import * as ipc from '@/lib/ipc';

interface AgentState {
  agents: AgentInstance[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAgents: () => Promise<void>;
  addAgent: (agent: AgentInstance) => void;
  removeAgent: (agentId: string) => Promise<void>;
  updateAgentStatus: (agentId: string, status: AgentStatus, metadata?: Partial<AgentMetadata>) => void;
  addAgentUpdate: (agentId: string, update: SessionUpdate) => void;
  addAgentOutput: (agentId: string, output: string) => void;
  addAgentError: (agentId: string, error: AgentError) => void;
  updateAgentStats: (agentId: string, stats: Partial<AgentStats>) => void;
  setPendingPermission: (agentId: string, permission: PermissionRequest | null) => void;
  selectAgent: (agentId: string | null) => void;
  killAgent: (agentId: string) => Promise<void>;
  restartAgent: (agentId: string) => Promise<void>;
  clearAgentOutput: (agentId: string) => void;
  clearAgentErrors: (agentId: string) => void;

  // Getters
  getAgentById: (agentId: string) => AgentInstance | undefined;
  getAgentsByProject: (projectId: string) => AgentInstance[];
  getRunningAgents: () => AgentInstance[];
  getAgentCount: () => number;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],
      selectedAgentId: null,
      isLoading: false,
      error: null,

      loadAgents: async () => {
        set({ isLoading: true, error: null });
        try {
          const agents = await ipc.listAgents();
          set({ agents, isLoading: false });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to load agents';
          set({ error: errorMsg, isLoading: false });
          console.error('Failed to load agents:', error);
        }
      },

      addAgent: (agent) => {
        set((state) => ({
          agents: [...state.agents, {
            ...agent,
            output: [],
            outputLineCount: 0,
            errors: [],
            updatedAt: Date.now(),
          }],
        }));
      },

      removeAgent: async (agentId) => {
        try {
          // Get agent's projectId before removing
          const agent = get().agents.find((a) => a.id === agentId);
          await ipc.killAgent(agentId);
          set((state) => ({
            agents: state.agents.filter((a) => a.id !== agentId),
          }));
          // Also remove from project's agents array
          if (agent?.projectId) {
            const { removeAgentFromProject } = await import('./projectStore').then(
              (m) => m.useProjectStore.getState()
            );
            removeAgentFromProject(agent.projectId, agentId);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to remove agent';
          set({ error: errorMsg });
          console.error('Failed to kill agent:', error);
        }
      },

      updateAgentStatus: (agentId, status, metadata) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  status,
                  updatedAt: Date.now(),
                  metadata: metadata
                    ? { ...agent.metadata, ...metadata }
                    : agent.metadata,
                }
              : agent
          ),
        }));
      },

      addAgentUpdate: (agentId, update) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  updates: [...agent.updates.slice(-99), update],
                  updatedAt: Date.now(),
                  stats: {
                    ...agent.stats,
                    messagesReceived: (agent.stats?.messagesReceived || 0) + 1,
                  },
                }
              : agent
          ),
        }));
      },

      addAgentOutput: (agentId, output) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  output: [...agent.output.slice(-499), output],
                  outputLineCount: (agent.outputLineCount || 0) + 1,
                  updatedAt: Date.now(),
                }
              : agent
          ),
        }));
      },

      addAgentError: (agentId, error) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  errors: [...agent.errors.slice(-49), error],
                  updatedAt: Date.now(),
                  status: error.fatal ? 'error' : agent.status,
                }
              : agent
          ),
        }));
      },

      updateAgentStats: (agentId, stats) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  stats: { ...agent.stats, ...stats },
                }
              : agent
          ),
        }));
      },

      setPendingPermission: (agentId, permission) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, pendingPermission: permission } : agent
          ),
        }));
      },

      selectAgent: (agentId) => {
        set({ selectedAgentId: agentId });
      },

      killAgent: async (agentId) => {
        try {
          await ipc.killAgent(agentId);
          get().updateAgentStatus(agentId, 'exited', { endTime: Date.now() });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to kill agent';
          set({ error: errorMsg });
          console.error('Failed to kill agent:', error);
        }
      },

      restartAgent: async (agentId) => {
        try {
          // Kill the existing agent (restart_agent just kills in the backend)
          await ipc.restartAgent(agentId);
          get().updateAgentStatus(agentId, 'exited', { endTime: Date.now() });
          // Note: The frontend (SpawnDialog or AgentCard) should handle respawning
          // with the same profile since the Rust backend doesn't store profiles.
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to restart agent';
          set({ error: errorMsg });
          console.error('Failed to restart agent:', error);
        }
      },

      clearAgentOutput: (agentId) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, output: [], outputLineCount: 0 } : agent
          ),
        }));
      },

      clearAgentErrors: (agentId) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, errors: [] } : agent
          ),
        }));
      },

      getAgentById: (agentId) => {
        return get().agents.find((a) => a.id === agentId);
      },

      getAgentsByProject: (projectId) => {
        return get().agents.filter((a) => a.projectId === projectId);
      },

      getRunningAgents: () => {
        return get().agents.filter((a) => a.status === 'running');
      },

      getAgentCount: () => {
        return get().agents.length;
      },
    }),
    {
      name: 'multipilot-agents',
      partialize: (state) => ({ selectedAgentId: state.selectedAgentId }),
    }
  )
);

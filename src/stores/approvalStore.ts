import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionRequest } from '@/lib/types';
import { respondToACPPermission } from '@/lib/ipc';

interface ApprovalState {
  queue: PermissionRequest[];
  history: PermissionRequest[];
  addRequest: (request: PermissionRequest) => void;
  removeRequest: (requestId: string) => void;
  approve: (requestId: string, reason?: string) => Promise<void>;
  reject: (requestId: string, reason?: string) => Promise<void>;
  getForAgent: (agentId: string) => PermissionRequest[];
  getHistory: () => PermissionRequest[];
  clearHistory: () => void;
}

export const useApprovalStore = create<ApprovalState>()(
  persist(
    (set, get) => ({
      queue: [],
      history: [],

      addRequest: (request) => {
        set((state) => ({
          queue: [...state.queue, request],
        }));
      },

      removeRequest: (requestId) => {
        const request = get().queue.find((r) => r.id === requestId);
        if (request) {
          set((state) => ({
            queue: state.queue.filter((r) => r.id !== requestId),
            history: [request, ...state.history].slice(0, 100), // Keep last 100
          }));
        }
      },

      approve: async (requestId, reason) => {
        try {
          await respondToACPPermission(requestId, true, reason);
          get().removeRequest(requestId);
        } catch (error) {
          console.error('Failed to approve request:', error);
        }
      },

      reject: async (requestId, reason) => {
        try {
          await respondToACPPermission(requestId, false, reason || 'Rejected by user');
          get().removeRequest(requestId);
        } catch (error) {
          console.error('Failed to reject request:', error);
        }
      },

      getForAgent: (agentId) => {
        return get().queue.filter((r) => r.agentId === agentId);
      },

      getHistory: () => get().history,

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'multipilot-approvals',
      partialize: (state) => ({ history: state.history }),
    }
  )
);

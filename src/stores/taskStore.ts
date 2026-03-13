import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanStep } from '@/lib/types';

export interface Task {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  steps: PlanStep[];
  currentStepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

interface TaskState {
  tasks: Task[];

  // Task CRUD
  createTask: (agentId: string, title: string, description?: string, steps?: PlanStep[]) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  completeTask: (taskId: string, success?: boolean) => void;
  cancelTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  // Step management
  updateSteps: (taskId: string, steps: PlanStep[]) => void;
  setCurrentStep: (taskId: string, stepIndex: number) => void;
  completeStep: (taskId: string, stepId: string) => void;
  failStep: (taskId: string, stepId: string) => void;

  // Getters
  getActiveTasks: () => Task[];
  getTasksForAgent: (agentId: string) => Task[];
  getTaskById: (taskId: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      createTask: (agentId, title, description, steps = []) => {
        const task: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agentId,
          title,
          description,
          steps,
          currentStepIndex: 0,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          tasks: [task, ...state.tasks],
        }));

        return task;
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          ),
        }));
      },

      completeTask: (taskId, success = true) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: success ? 'completed' : 'failed',
                  completedAt: Date.now(),
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      cancelTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'cancelled',
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
      },

      updateSteps: (taskId, steps) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, steps, updatedAt: Date.now() }
              : t
          ),
        }));
      },

      setCurrentStep: (taskId, stepIndex) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  currentStepIndex: stepIndex,
                  status: 'running',
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      completeStep: (taskId, stepId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  steps: t.steps.map((s) =>
                    s.id === stepId ? { ...s, status: 'completed' as const } : s
                  ),
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      failStep: (taskId, stepId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  steps: t.steps.map((s) =>
                    s.id === stepId ? { ...s, status: 'failed' as const } : s
                  ),
                  status: 'failed',
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      getActiveTasks: () => {
        return get().tasks.filter((t) =>
          t.status === 'running' || t.status === 'pending'
        );
      },

      getTasksForAgent: (agentId) => {
        return get().tasks.filter((t) => t.agentId === agentId);
      },

      getTaskById: (taskId) => {
        return get().tasks.find((t) => t.id === taskId);
      },
    }),
    {
      name: 'multipilot-tasks',
      partialize: (state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'running'), // Don't persist running tasks
      }),
    }
  )
);

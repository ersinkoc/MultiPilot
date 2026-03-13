import { create } from 'zustand';

export type ActivityType =
  | 'agent_spawned'
  | 'agent_killed'
  | 'agent_restarted'
  | 'agent_status_changed'
  | 'task_created'
  | 'task_completed'
  | 'task_failed'
  | 'permission_requested'
  | 'permission_approved'
  | 'permission_rejected'
  | 'tool_executed'
  | 'file_changed'
  | 'git_commit'
  | 'git_push'
  | 'git_pull'
  | 'message_sent'
  | 'error';

export interface Activity {
  id: string;
  type: ActivityType;
  agentId?: string;
  agentName?: string;
  projectId?: string;
  projectName?: string;
  message: string;
  details?: unknown;
  timestamp: number;
  read: boolean;
}

interface ActivityState {
  activities: Activity[];
  unreadCount: number;
  filter: ActivityType | 'all';

  // Actions
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (activityId: string) => void;
  markAllAsRead: () => void;
  clearActivities: () => void;
  setFilter: (filter: ActivityType | 'all') => void;

  // Getters
  getFilteredActivities: () => Activity[];
  getUnreadActivities: () => Activity[];
  getActivitiesForAgent: (agentId: string) => Activity[];
  getRecentActivities: (count?: number) => Activity[];
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
  activities: [],
  unreadCount: 0,
  filter: 'all',

  addActivity: (activity) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => ({
      activities: [newActivity, ...state.activities].slice(0, 500), // Keep last 500
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (activityId) => {
    set((state) => {
      const wasUnread = state.activities.find((a) => a.id === activityId && !a.read);
      return {
        activities: state.activities.map((a) =>
          a.id === activityId ? { ...a, read: true } : a
        ),
        unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      activities: state.activities.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    }));
  },

  clearActivities: () => {
    set({ activities: [], unreadCount: 0 });
  },

  setFilter: (filter) => {
    set({ filter });
  },

  getFilteredActivities: () => {
    const { activities, filter } = get();
    if (filter === 'all') return activities;
    return activities.filter((a) => a.type === filter);
  },

  getUnreadActivities: () => {
    return get().activities.filter((a) => !a.read);
  },

  getActivitiesForAgent: (agentId) => {
    return get().activities.filter((a) => a.agentId === agentId);
  },

  getRecentActivities: (count = 10) => {
    return get().activities.slice(0, count);
  },
}));

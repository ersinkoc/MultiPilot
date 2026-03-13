import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  onClose?: () => void;
}

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;

  // Actions
  notify: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  info: (title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;

  closeNotification: (id: string) => void;
  closeAll: () => void;

  // Getters
  getRecent: (count: number) => Notification[];
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  maxNotifications: 5,

  notify: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(
        0,
        state.maxNotifications
      ),
    }));

    // Auto-close if duration is set
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        get().closeNotification(newNotification.id);
      }, notification.duration);
    }
  },

  info: (title, message, duration = 5000) => {
    get().notify({ type: 'info', title, message, duration });
  },

  success: (title, message, duration = 3000) => {
    get().notify({ type: 'success', title, message, duration });
  },

  warning: (title, message, duration = 5000) => {
    get().notify({ type: 'warning', title, message, duration });
  },

  error: (title, message, duration = 8000) => {
    get().notify({ type: 'error', title, message, duration });
  },

  closeNotification: (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    if (notification?.onClose) {
      notification.onClose();
    }

    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  closeAll: () => {
    get().notifications.forEach((n) => {
      if (n.onClose) n.onClose();
    });
    set({ notifications: [] });
  },

  getRecent: (count) => {
    return get().notifications.slice(0, count);
  },
}));

// Convenience hook
export function useNotify() {
  const { info, success, warning, error } = useNotificationStore();
  return { info, success, warning, error };
}

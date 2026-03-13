import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotificationStore, Notification, NotificationType } from '@/stores/notificationStore';

const iconMap: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const colorMap: Record<NotificationType, string> = {
  info: 'border-blue-500/40 bg-blue-500/10',
  success: 'border-green-500/40 bg-green-500/10',
  warning: 'border-yellow-500/40 bg-yellow-500/10',
  error: 'border-red-500/40 bg-red-500/10',
};

const iconColorMap: Record<NotificationType, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

export function NotificationContainer() {
  const { notifications, closeNotification } = useNotificationStore();

  return (
    <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => closeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const Icon = iconMap[notification.type];

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(onClose, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  return (
    <div
      className={`pointer-events-auto flex gap-2.5 p-3 rounded-lg border shadow-lg backdrop-blur-sm slide-in-from-right ${colorMap[notification.type]}`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColorMap[notification.type]}`} />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{notification.title}</div>
        {notification.message && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </div>
        )}

        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className="px-2 py-1 text-[11px] font-medium bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

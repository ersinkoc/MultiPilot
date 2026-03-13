import { AgentStatus } from '@/lib/types';

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const statusConfig: Record<
    AgentStatus,
    { label: string; className: string }
  > = {
    starting: {
      label: 'Starting',
      className: 'bg-yellow-500/20 text-yellow-500',
    },
    running: {
      label: 'Running',
      className: 'bg-green-500/20 text-green-500',
    },
    waiting_input: {
      label: 'Waiting',
      className: 'bg-blue-500/20 text-blue-500',
    },
    idle: {
      label: 'Idle',
      className: 'bg-gray-500/20 text-gray-500',
    },
    exited: {
      label: 'Exited',
      className: 'bg-red-500/20 text-red-500',
    },
    error: {
      label: 'Error',
      className: 'bg-red-500/20 text-red-500',
    },
    reconnecting: {
      label: 'Reconnecting',
      className: 'bg-orange-500/20 text-orange-500',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

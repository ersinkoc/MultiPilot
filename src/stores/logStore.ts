import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogEntry } from '@/lib/types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogFilter {
  levels: LogLevel[];
  sources: string[];
  searchQuery: string;
  agentId?: string;
  projectId?: string;
  startTime?: number;
  endTime?: number;
}

interface LogState {
  logs: LogEntry[];
  filters: LogFilter;
  maxLogs: number;
  isPaused: boolean;
  selectedLogId: string | null;

  // Actions
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  addDebug: (source: string, message: string, details?: unknown) => void;
  addInfo: (source: string, message: string, details?: unknown) => void;
  addWarn: (source: string, message: string, details?: unknown) => void;
  addError: (source: string, message: string, details?: unknown, agentId?: string) => void;
  addFatal: (source: string, message: string, details?: unknown, agentId?: string) => void;

  clearLogs: () => void;
  clearOldLogs: (maxAge: number) => void;
  setFilter: (filter: Partial<LogFilter>) => void;
  resetFilters: () => void;
  setPaused: (paused: boolean) => void;
  setMaxLogs: (count: number) => void;
  selectLog: (id: string | null) => void;

  // Getters
  getFilteredLogs: () => LogEntry[];
  getStats: () => Record<LogLevel, number>;
  exportLogs: (format: 'json' | 'csv' | 'txt') => string;
}

const createLogEntry = (level: LogLevel, source: string, message: string, details?: unknown, agentId?: string, projectId?: string): LogEntry => ({
  id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: Date.now(),
  level,
  source,
  message,
  details,
  agentId,
  projectId,
});

export const useLogStore = create<LogState>()(
  persist(
    (set, get) => ({
      logs: [],
      filters: {
        levels: ['info', 'warn', 'error', 'fatal'],
        sources: [],
        searchQuery: '',
      },
      maxLogs: 10000,
      isPaused: false,
      selectedLogId: null,

      addLog: (entry) => {
        if (get().isPaused) return;

        const newLog: LogEntry = {
          ...entry,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => {
          const newLogs = [newLog, ...state.logs].slice(0, state.maxLogs);
          return { logs: newLogs };
        });

        // Also log to console in development
        if (import.meta.env.DEV) {
          const consoleMethod = {
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error,
            fatal: console.error,
          }[entry.level];
          consoleMethod(`[${entry.source}] ${entry.message}`, entry.details || '');
        }
      },

      addDebug: (source, message, details) => {
        get().addLog(createLogEntry('debug', source, message, details));
      },

      addInfo: (source, message, details) => {
        get().addLog(createLogEntry('info', source, message, details));
      },

      addWarn: (source, message, details) => {
        get().addLog(createLogEntry('warn', source, message, details));
      },

      addError: (source, message, details, agentId) => {
        get().addLog(createLogEntry('error', source, message, details, agentId));
      },

      addFatal: (source, message, details, agentId) => {
        get().addLog(createLogEntry('fatal', source, message, details, agentId));
      },

      clearLogs: () => set({ logs: [] }),

      clearOldLogs: (maxAge) => {
        const cutoff = Date.now() - maxAge;
        set((state) => ({
          logs: state.logs.filter((log) => log.timestamp > cutoff),
        }));
      },

      setFilter: (filter) => {
        set((state) => ({
          filters: { ...state.filters, ...filter },
        }));
      },

      resetFilters: () => {
        set({
          filters: {
            levels: ['info', 'warn', 'error', 'fatal'],
            sources: [],
            searchQuery: '',
          },
        });
      },

      setPaused: (paused) => set({ isPaused: paused }),

      setMaxLogs: (count) => {
        set((state) => ({
          maxLogs: count,
          logs: state.logs.slice(0, count),
        }));
      },

      selectLog: (id) => set({ selectedLogId: id }),

      getFilteredLogs: () => {
        const { logs, filters } = get();
        return logs.filter((log) => {
          if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
            return false;
          }
          if (filters.sources.length > 0 && !filters.sources.includes(log.source)) {
            return false;
          }
          if (filters.agentId && log.agentId !== filters.agentId) {
            return false;
          }
          if (filters.projectId && log.projectId !== filters.projectId) {
            return false;
          }
          if (filters.startTime && log.timestamp < filters.startTime) {
            return false;
          }
          if (filters.endTime && log.timestamp > filters.endTime) {
            return false;
          }
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesMessage = log.message.toLowerCase().includes(query);
            const matchesSource = log.source.toLowerCase().includes(query);
            const matchesDetails = log.details
              ? JSON.stringify(log.details).toLowerCase().includes(query)
              : false;
            if (!matchesMessage && !matchesSource && !matchesDetails) {
              return false;
            }
          }
          return true;
        });
      },

      getStats: () => {
        const stats: Record<LogLevel, number> = {
          debug: 0,
          info: 0,
          warn: 0,
          error: 0,
          fatal: 0,
        };
        get().logs.forEach((log) => {
          stats[log.level]++;
        });
        return stats;
      },

      exportLogs: (format) => {
        const logs = get().getFilteredLogs();

        switch (format) {
          case 'json':
            return JSON.stringify(logs, null, 2);
          case 'csv':
            const headers = 'timestamp,level,source,message,agentId\n';
            const rows = logs
              .map(
                (log) =>
                  `${new Date(log.timestamp).toISOString()},${log.level},"${log.source}","${log.message}",${log.agentId || ''}`
              )
              .join('\n');
            return headers + rows;
          case 'txt':
            return logs
              .map(
                (log) =>
                  `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
              )
              .join('\n');
          default:
            return '';
        }
      },
    }),
    {
      name: 'multipilot-logs',
      partialize: (state) => ({ maxLogs: state.maxLogs }),
    }
  )
);

// Convenience hook for common logging patterns
export function useLogger(source: string) {
  const { addDebug, addInfo, addWarn, addError, addFatal } = useLogStore();

  return {
    debug: (message: string, details?: unknown) => addDebug(source, message, details),
    info: (message: string, details?: unknown) => addInfo(source, message, details),
    warn: (message: string, details?: unknown) => addWarn(source, message, details),
    error: (message: string, details?: unknown, agentId?: string) =>
      addError(source, message, details, agentId),
    fatal: (message: string, details?: unknown, agentId?: string) =>
      addFatal(source, message, details, agentId),
  };
}

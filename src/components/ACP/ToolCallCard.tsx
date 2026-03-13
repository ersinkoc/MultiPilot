import { useState } from 'react';
import { Terminal, FileEdit, FilePlus, FileX, Search, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolCallCardProps {
  toolName: string;
  params?: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  result?: string;
  startTime?: number;
  endTime?: number;
}

export function ToolCallCard({
  toolName,
  params,
  status,
  result,
  startTime,
  endTime,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(status === 'running');

  const getIcon = () => {
    switch (toolName) {
      case 'read_file':
      case 'view_file':
        return <Search className="w-4 h-4" />;
      case 'edit_file':
      case 'modify_file':
        return <FileEdit className="w-4 h-4" />;
      case 'create_file':
      case 'write_file':
        return <FilePlus className="w-4 h-4" />;
      case 'delete_file':
      case 'remove_file':
        return <FileX className="w-4 h-4" />;
      case 'run_command':
      case 'execute':
      case 'bash':
        return <Terminal className="w-4 h-4" />;
      default:
        return <Terminal className="w-4 h-4" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    }
  };

  const getDuration = () => {
    if (!startTime) return null;
    const end = endTime || Date.now();
    const ms = end - startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format params for display
  const formatParams = () => {
    if (!params) return null;

    return Object.entries(params).map(([key, value]) => {
      let displayValue: string;
      if (typeof value === 'string') {
        // Truncate long strings
        displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
      } else {
        displayValue = JSON.stringify(value);
      }

      return (
        <div key={key} className="text-xs">
          <span className="text-muted-foreground">{key}:</span>{' '}
          <span className="font-mono text-foreground/80">{displayValue}</span>
        </div>
      );
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
            {getIcon()}
          </div>
          <span className="text-sm font-medium">{toolName}</span>
          {getDuration() && (
            <span className="text-xs text-muted-foreground">({getDuration()})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          {/* Parameters */}
          {params && Object.keys(params).length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Parameters</div>
              <div className="space-y-0.5 p-2 bg-background rounded border border-border">
                {formatParams()}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Result</div>
              <pre className="p-2 bg-background rounded border border-border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {result}
              </pre>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && !result && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <XCircle className="w-3.5 h-3.5" />
              Tool execution failed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

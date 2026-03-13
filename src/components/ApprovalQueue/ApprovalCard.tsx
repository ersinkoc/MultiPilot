import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Eye, FileCode, AlertTriangle } from 'lucide-react';
import type { PermissionRequest } from '@/lib/types';
import { DiffViewer } from '@/components/ACP/DiffViewer';

interface ApprovalCardProps {
  request: PermissionRequest;
  agentName: string;
  agentColor: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  request,
  agentName,
  agentColor,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Extract diff data from request's toolParams if available
  const params = request.toolParams as Record<string, unknown> | undefined;
  const diffOld = (params?.old_content as string) || (params?.original as string) || '';
  const diffNew = (params?.new_content as string) || (params?.content as string) || '';

  const isFileOperation = ['write_file', 'edit_file', 'apply_diff'].includes(request.toolName);
  const isDangerous = ['delete_file', 'execute_command', 'shell'].includes(request.toolName);

  return (
    <div className={`border rounded-lg overflow-hidden ${isDangerous ? 'border-red-500/30' : 'border-border'}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: agentColor }}
        >
          <span className="text-xs font-bold text-white">
            {agentName.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{request.toolName}</span>
            {isDangerous && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">{agentName}</span>
        </div>

        <div className="flex items-center gap-2">
          {isFileOperation && (
            <FileCode className="w-4 h-4 text-muted-foreground" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Description */}
          <div className="py-3 text-sm">{request.description}</div>

          {/* Tool Params */}
          {request.toolParams && (
            <div className="mb-3 p-3 bg-muted rounded-md overflow-x-auto">
              <pre className="text-xs text-muted-foreground">
                {JSON.stringify(request.toolParams, null, 2)}
              </pre>
            </div>
          )}

          {/* Diff Preview */}
          {isFileOperation && showDiff && (
            <div className="mb-3">
              <DiffViewer
                oldValue={diffOld}
                newValue={diffNew}
                filename={(request.toolParams as Record<string, unknown>)?.path as string || 'changes'}
                splitView={false}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {isFileOperation && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md"
              >
                <Eye className="w-3.5 h-3.5" />
                {showDiff ? 'Hide Diff' : 'Preview Diff'}
              </button>
            )}

            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md"
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </button>

            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions (when collapsed) */}
      {!isExpanded && (
        <div className="flex items-center gap-1 px-4 py-2 border-t border-border bg-muted/30">
          {isFileOperation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDiff(true);
                setIsExpanded(true);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            className="px-2 py-1 text-xs text-green-500 hover:bg-green-500/10 rounded"
          >
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
            className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

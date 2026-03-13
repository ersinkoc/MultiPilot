import { useState } from 'react';
import { Check, X, ChevronRight, Shield, Eye } from 'lucide-react';
import { useApprovalStore } from '@/stores/approvalStore';
import { useAgentStore } from '@/stores/agentStore';
import { useProfileStore } from '@/stores/profileStore';
import { DiffViewer } from '@/components/ACP/DiffViewer';
import type { PermissionRequest } from '@/lib/types';

type ApprovalView = 'list' | 'diff' | 'plan';

export function ApprovalQueue() {
  const { queue, approve, reject } = useApprovalStore();
  const { agents } = useAgentStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [currentView, setCurrentView] = useState<ApprovalView>('list');

  // Extract diff data from request's toolParams if available
  const getDiffData = (request: PermissionRequest) => {
    const params = request.toolParams as Record<string, unknown> | undefined;
    const oldValue = (params?.old_content as string) || (params?.original as string) || '';
    const newValue = (params?.new_content as string) || (params?.content as string) || '';
    return { oldValue, newValue };
  };

  if (queue.length === 0 && !isCollapsed) {
    return null;
  }

  if (isCollapsed && queue.length > 0) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed right-4 top-20 z-40 flex items-center gap-2 px-3 py-2 bg-accent text-accent-foreground rounded-lg shadow-lg hover:bg-accent/90 transition-colors"
      >
        <div className="relative">
          <Shield className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {queue.length}
          </span>
        </div>
        <span className="text-sm font-medium">{queue.length} pending</span>
      </button>
    );
  }

  return (
    <aside className="w-[420px] border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium">Approvals</h3>
          <span className="px-1.5 py-0.5 text-[10px] bg-accent text-accent-foreground rounded-full leading-none">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {currentView !== 'list' && (
            <button
              onClick={() => {
                setCurrentView('list');
                setSelectedRequest(null);
              }}
              className="px-3 py-1.5 text-xs font-medium hover:bg-secondary rounded-md"
            >
              Back to List
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-secondary"
            title="Collapse"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'list' && (
          <div className="h-full overflow-y-auto">
            {queue.map((request) => {
              const agent = agents.find((a) => a.id === request.agentId);
              const profile = useProfileStore.getState().getProfileById(agent?.profileId || '');
              const isToolWithDiff = ['write_file', 'edit_file', 'apply_diff'].includes(request.toolName);

              return (
                <div
                  key={request.id}
                  className="p-4 border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Agent Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: profile?.color || '#3b82f6' }}
                    >
                      <span className="text-xs font-bold text-white">
                        {profile?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{request.toolName}</div>
                      <div className="text-xs text-muted-foreground">{agent?.id}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-sm text-foreground/80 mb-3 bg-muted/50 p-3 rounded-md">
                    {request.description}
                  </div>

                  {/* Tool Params Preview */}
                  {request.toolParams && (
                    <div className="mb-3 text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded overflow-x-auto">
                      {JSON.stringify(request.toolParams, null, 2).slice(0, 200)}
                      {JSON.stringify(request.toolParams).length > 200 && '...'}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isToolWithDiff && (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setCurrentView('diff');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Diff
                      </button>
                    )}
                    <button
                      onClick={() => approve(request.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => reject(request.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}

            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No pending approvals</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'diff' && selectedRequest && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <div className="text-sm font-medium">Preview Changes</div>
              <div className="text-xs text-muted-foreground">{selectedRequest.toolName}</div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => { const { oldValue, newValue } = getDiffData(selectedRequest); return (
              <DiffViewer
                oldValue={oldValue}
                newValue={newValue}
                filename={(selectedRequest.toolParams as Record<string, unknown>)?.path as string || 'changes'}
                splitView={false}
              />); })()}
            </div>
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approve(selectedRequest.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md"
                >
                  <Check className="w-4 h-4" />
                  Approve & Apply
                </button>
                <button
                  onClick={() => reject(selectedRequest.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {currentView === 'list' && queue.length > 1 && (
        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => Promise.all(queue.map((r) => approve(r.id)))}
              className="flex-1 px-3 py-2 text-xs font-medium bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md"
            >
              Approve All ({queue.length})
            </button>
            <button
              onClick={() => Promise.all(queue.map((r) => reject(r.id)))}
              className="flex-1 px-3 py-2 text-xs font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md"
            >
              Reject All
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

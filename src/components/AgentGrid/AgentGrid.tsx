import { useState } from 'react';
import { Plus, Grid3X3, LayoutList, Trash2 } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useProjectStore } from '@/stores/projectStore';
import { AgentCard } from './AgentCard';

type ViewMode = 'grid' | 'list';

export function AgentGrid() {
  const { agents } = useAgentStore();
  const { activeProject } = useProjectStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { removeAgent } = useAgentStore();

  const projectAgents = activeProject
    ? agents.filter((a) => a.projectId === activeProject.id)
    : agents;

  const exitedCount = projectAgents.filter(a => a.status === 'exited' || a.status === 'error').length;

  const handleClearExited = () => {
    projectAgents
      .filter(a => a.status === 'exited' || a.status === 'error')
      .forEach(a => removeAgent(a.id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Agents</h2>
          <span className="text-xs text-muted-foreground">({projectAgents.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-card shadow-sm' : ''}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-card shadow-sm' : ''}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {exitedCount > 0 && (
            <button
              onClick={handleClearExited}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md"
              title="Remove all exited agents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear ({exitedCount})
            </button>
          )}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-spawn-dialog'))}
            disabled={!activeProject}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Spawn
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {projectAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">No agents running</h3>
            <p className="text-sm text-muted-foreground mb-3 max-w-xs">
              {activeProject
                ? 'Spawn an AI agent to start working on this project.'
                : 'Select a project and spawn an agent to get started.'}
            </p>
            {activeProject && (
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-spawn-dialog'))}
                className="px-3 py-1.5 text-sm font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
              >
                Spawn Agent
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-3 auto-rows-min'
                : 'flex flex-col gap-2'
            }
            style={viewMode === 'grid' ? {
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            } : undefined}
          >
            {projectAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  LayoutGrid,
  FolderOpen,
  GitBranch,
  Settings,
  Plus,
  ChevronDown,
  Bot,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useAgentStore } from '@/stores/agentStore';
import { useProfileStore } from '@/stores/profileStore';
import { open } from '@tauri-apps/plugin-dialog';

export function Sidebar() {
  const { projects, activeProject, setActiveProject, removeProject, viewMode, setViewMode } =
    useProjectStore();
  const { agents } = useAgentStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleAddProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        await useProjectStore.getState().addProject(selected);
      }
    } catch (error) {
      console.error('Failed to open directory:', error);
    }
  };

  const navItems = [
    { id: 'agents' as const, icon: LayoutGrid, label: 'Agents' },
    { id: 'files' as const, icon: FolderOpen, label: 'Files' },
    { id: 'git' as const, icon: GitBranch, label: 'Git' },
  ];

  const runningCount = agents.filter((a) => a.status === 'running').length;

  // ── Collapsed sidebar ──────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <aside className="flex flex-col w-12 border-r border-border bg-card items-center">
        <div className="flex items-center justify-center h-10 border-b border-border w-full">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
        </div>

        <nav className="p-1.5 space-y-0.5 w-full">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`w-full flex items-center justify-center p-1.5 rounded-md transition-colors ${
                viewMode === item.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </nav>

        <div className="flex-1 flex flex-col items-center gap-1 py-1.5 w-full overflow-y-auto">
          {projects.map((project) => {
            const projectAgents = agents.filter((a) => a.projectId === project.id);
            const isActive = activeProject?.id === project.id;
            const running = projectAgents.filter((a) => a.status === 'running').length;

            return (
              <button
                key={project.id}
                onClick={() => setActiveProject(project)}
                className={`relative w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
                title={`${project.name} (${projectAgents.length} agents)`}
              >
                {project.name.charAt(0).toUpperCase()}
                {running > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 text-white text-[8px] rounded-full flex items-center justify-center">
                    {running}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={handleAddProject}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary border border-dashed border-border"
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-1.5 border-t border-border w-full space-y-0.5">
          <button
            onClick={() => setViewMode('settings')}
            className={`w-full flex items-center justify-center p-1.5 rounded-md transition-colors ${
              viewMode === 'settings'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:bg-secondary"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // ── Full sidebar ────────────────────────────────────────────────────
  return (
    <aside className="flex flex-col w-56 border-r border-border bg-card">
      <div className="flex items-center justify-between px-3 h-10 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent">
            <Bot className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-semibold">MultiPilot</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      <nav className="p-1.5 space-y-0.5">
        {navItems.map((item) => {
          const badge =
            item.id === 'agents' && runningCount > 0
              ? runningCount
              : null;
          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`sidebar-item w-full ${viewMode === item.id ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left text-xs">{item.label}</span>
              {badge && (
                <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Projects
          </span>
          <button
            onClick={handleAddProject}
            className="p-0.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-1.5 space-y-0.5">
          {projects.map((project) => {
            const projectAgents = agents.filter((a) => a.projectId === project.id);
            const isExpanded = expandedProjects.has(project.id);
            const isActive = activeProject?.id === project.id;
            const running = projectAgents.filter((a) => a.status === 'running').length;

            return (
              <div key={project.id}>
                <div
                  className={`sidebar-item group ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveProject(project);
                    toggleProject(project.id);
                  }}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                  />
                  <span className="flex-1 truncate text-xs">{project.name}</span>
                  {running > 0 && (
                    <span className="px-1 py-0.5 text-[9px] bg-green-500/20 text-green-400 rounded-full shrink-0 leading-none">
                      {running}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (projectAgents.filter((a) => a.status === 'running').length > 0) {
                        if (!confirm(`"${project.name}" has running agents. Remove anyway?`)) return;
                      }
                      removeProject(project.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {projectAgents.map((agent) => {
                      const profile = useProfileStore.getState().getProfileById(agent.profileId);
                      return (
                        <div
                          key={agent.id}
                          className="sidebar-item text-[11px] text-muted-foreground py-1"
                          onClick={() => {
                            useAgentStore.getState().selectAgent(agent.id);
                            setViewMode('agents');
                          }}
                        >
                          <Bot className="w-3 h-3 shrink-0" />
                          <span className="truncate">{profile?.name || agent.id}</span>
                          <span
                            className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
                              agent.status === 'running'
                                ? 'bg-green-500'
                                : agent.status === 'error'
                                ? 'bg-red-500'
                                : agent.status === 'exited'
                                ? 'bg-gray-500'
                                : 'bg-yellow-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                    {projectAgents.length === 0 && (
                      <button
                        onClick={() => {
                          setViewMode('agents');
                          document.dispatchEvent(new CustomEvent('open-spawn-dialog'));
                        }}
                        className="sidebar-item text-[11px] text-muted-foreground w-full py-1"
                      >
                        <Play className="w-3 h-3 shrink-0" />
                        <span>Spawn agent...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">No projects yet</p>
            <button
              onClick={handleAddProject}
              className="mt-1.5 text-[11px] text-accent hover:underline"
            >
              Add your first project
            </button>
          </div>
        )}
      </div>

      <div className="p-1.5 border-t border-border">
        <button
          onClick={() => setViewMode('settings')}
          className={`sidebar-item w-full ${viewMode === 'settings' ? 'active' : ''}`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </aside>
  );
}

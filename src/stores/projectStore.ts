import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ViewMode } from '@/lib/types';
import * as ipc from '@/lib/ipc';

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  viewMode: ViewMode;
  loadProjects: () => Promise<void>;
  addProject: (path: string, name?: string) => Promise<void>;
  removeProject: (projectId: string) => void;
  setActiveProject: (project: Project | null) => void;
  addAgentToProject: (projectId: string, agentId: string) => void;
  removeAgentFromProject: (projectId: string, agentId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  updateProjectGit: (projectId: string, git: Project['git']) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProject: null,
      viewMode: 'agents',

      loadProjects: async () => {
        // Projects are loaded from persist middleware automatically
      },

      addProject: async (path, name) => {
        try {
          const git = await ipc.gitStatus(path).catch(() => null);

          const project: Project = {
            id: `project_${Date.now()}`,
            name: name || path.split('/').pop() || path.split('\\').pop() || 'Unknown',
            path,
            agents: [],
            git: git
              ? {
                  branch: git.branch,
                  tracking: git.tracking,
                  ahead: git.ahead,
                  behind: git.behind,
                  modified: git.modified,
                  staged: git.staged,
                  untracked: git.untracked,
                  conflicted: git.conflicted,
                  commits: [],
                  isDirty: git.modified.length > 0 || git.staged.length > 0 || git.untracked.length > 0,
                }
              : null,
            fileTree: null,
            isGitRepo: !!git,
          };

          set((state) => ({
            projects: [...state.projects, project],
            activeProject: project,
          }));
        } catch (error) {
          console.error('Failed to add project:', error);
        }
      },

      removeProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          activeProject:
            state.activeProject?.id === projectId ? null : state.activeProject,
        }));
      },

      addAgentToProject: (projectId: string, agentId: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, agents: [...p.agents, agentId] }
              : p
          ),
          activeProject:
            state.activeProject?.id === projectId
              ? {
                  ...state.activeProject,
                  agents: [...state.activeProject.agents, agentId],
                }
              : state.activeProject,
        }));
      },

      removeAgentFromProject: (projectId: string, agentId: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, agents: p.agents.filter((id) => id !== agentId) }
              : p
          ),
          activeProject:
            state.activeProject?.id === projectId
              ? {
                  ...state.activeProject,
                  agents: state.activeProject.agents.filter(
                    (id) => id !== agentId
                  ),
                }
              : state.activeProject,
        }));
      },

      setActiveProject: (project) => {
        set({ activeProject: project });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      updateProjectGit: (projectId, git) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, git } : p
          ),
          activeProject:
            state.activeProject?.id === projectId
              ? { ...state.activeProject, git }
              : state.activeProject,
        }));
      },
    }),
    {
      name: 'multipilot-projects',
      partialize: (state) => ({
        projects: state.projects,
        activeProject: state.activeProject,
      }),
    }
  )
);

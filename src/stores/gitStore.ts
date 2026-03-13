import { create } from 'zustand';
import type { GitState } from '@/lib/types';
import * as ipc from '@/lib/ipc';

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
}

interface GitStoreState {
  // Git state
  gitState: GitState | null;
  projectPath: string;
  isLoading: boolean;
  isRepo: boolean;
  error: string | null;

  // Branch operations
  branches: string[];
  currentBranch: string;

  // Staging
  selectedFiles: string[];

  // Commit
  commitMessage: string;

  // Diff
  diffContent: string;
  diffFile: string | null;
  isStagedDiff: boolean;

  // Commit history
  commits: GitCommit[];
  commitsLoading: boolean;

  // Stash
  stashList: string[];

  // Merge/Conflict
  hasConflicts: boolean;
  conflictedFiles: string[];

  // Dialogs
  branchDialog: {
    isOpen: boolean;
    mode: 'create' | 'checkout' | 'merge';
  };
  stashDialog: {
    isOpen: boolean;
    mode: 'push' | 'pop';
  };

  // Actions - Status
  loadGitStatus: (path: string) => Promise<void>;
  refreshStatus: () => Promise<void>;

  // Actions - Staging
  stageFiles: (files: string[]) => Promise<void>;
  unstageFiles: (files: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;

  // Actions - Commit
  commit: (message?: string) => Promise<boolean>;
  setCommitMessage: (message: string) => void;
  clearCommitMessage: () => void;

  // Actions - Remote
  push: () => Promise<boolean>;
  pull: () => Promise<boolean>;
  fetch: () => Promise<boolean>;

  // Actions - Branch
  loadBranches: () => Promise<void>;
  checkout: (branch: string) => Promise<boolean>;
  createBranch: (branch: string, checkout?: boolean) => Promise<boolean>;
  deleteBranch: (branch: string) => Promise<boolean>;
  mergeBranch: (branch: string) => Promise<boolean>;

  // Actions - Diff
  getDiff: (file?: string, staged?: boolean) => Promise<void>;
  clearDiff: () => void;

  // Actions - Log
  loadCommits: (maxCount?: number) => Promise<void>;

  // Actions - Stash
  loadStashList: () => Promise<void>;
  stash: (message?: string) => Promise<boolean>;
  stashPop: (index?: number) => Promise<boolean>;
  stashApply: (index?: number) => Promise<boolean>;
  stashDrop: (index?: number) => Promise<boolean>;

  // Actions - Reset
  resetFile: (file: string) => Promise<boolean>;
  resetAll: () => Promise<boolean>;
  hardReset: (commit?: string) => Promise<boolean>;

  // UI Actions
  selectFile: (file: string) => void;
  deselectFile: (file: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;

  // Dialogs
  openBranchDialog: (mode: 'create' | 'checkout' | 'merge') => void;
  closeBranchDialog: () => void;
  openStashDialog: (mode: 'push' | 'pop') => void;
  closeStashDialog: () => void;
}

export const useGitStore = create<GitStoreState>()((set, get) => ({
  gitState: null,
  projectPath: '',
  isLoading: false,
  isRepo: false,
  error: null,
  branches: [],
  currentBranch: '',
  selectedFiles: [],
  commitMessage: '',
  diffContent: '',
  diffFile: null,
  isStagedDiff: false,
  commits: [],
  commitsLoading: false,
  stashList: [],
  hasConflicts: false,
  conflictedFiles: [],
  branchDialog: { isOpen: false, mode: 'create' },
  stashDialog: { isOpen: false, mode: 'push' },

  loadGitStatus: async (path: string) => {
    if (!path) return;
    set({ isLoading: true, error: null, projectPath: path });
    try {
      const status = await ipc.gitStatus(path);
      set({
        gitState: status,
        isRepo: true,
        currentBranch: status.branch,
        hasConflicts: status.conflicted.length > 0,
        conflictedFiles: status.conflicted,
        isLoading: false,
      });
      // Load additional data
      await get().loadBranches();
      await get().loadCommits(20);
    } catch (error) {
      console.error('Failed to load git status:', error);
      set({
        gitState: null,
        isRepo: false,
        isLoading: false,
        error: String(error),
      });
    }
  },

  refreshStatus: async () => {
    const { projectPath } = get();
    if (!projectPath) return;
    await get().loadGitStatus(projectPath);
  },

  stageFiles: async (files: string[]) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return;

    try {
      await ipc.stageFiles(projectPath, files);
      await get().refreshStatus();
    } catch (error) {
      console.error('Failed to stage files:', error);
      set({ error: String(error) });
    }
  },

  unstageFiles: async (files: string[]) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return;

    try {
      await ipc.unstageFiles(projectPath, files);
      await get().refreshStatus();
    } catch (error) {
      console.error('Failed to unstage files:', error);
      set({ error: String(error) });
    }
  },

  stageAll: async () => {
    const { gitState } = get();
    if (!gitState) return;
    const allFiles = [
      ...gitState.modified,
      ...gitState.untracked,
    ];
    await get().stageFiles(allFiles);
  },

  unstageAll: async () => {
    const { gitState } = get();
    if (!gitState) return;
    await get().unstageFiles(gitState.staged);
  },

  commit: async (message?: string) => {
    const { gitState, commitMessage, projectPath } = get();
    if (!gitState || !projectPath) return false;

    const commitMsg = message || commitMessage;
    if (!commitMsg.trim()) {
      set({ error: 'Commit message is required' });
      return false;
    }

    try {
      await ipc.gitCommit(projectPath, commitMsg);
      set({ commitMessage: '' });
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to commit:', error);
      set({ error: String(error) });
      return false;
    }
  },

  setCommitMessage: (message: string) => {
    set({ commitMessage: message });
  },

  clearCommitMessage: () => {
    set({ commitMessage: '' });
  },

  push: async () => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    set({ isLoading: true });
    try {
      await ipc.gitPush(projectPath);
      await get().refreshStatus();
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to push:', error);
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },

  pull: async () => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    set({ isLoading: true });
    try {
      await ipc.gitPull(projectPath);
      await get().refreshStatus();
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to pull:', error);
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },

  fetch: async () => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    set({ isLoading: true });
    try {
      await ipc.gitFetch(projectPath);
      await get().refreshStatus();
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to fetch:', error);
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },

  loadBranches: async () => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return;

    try {
      const branches = await ipc.gitBranches(projectPath);
      set({ branches });
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  },

  checkout: async (branch: string) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    set({ isLoading: true });
    try {
      await ipc.gitCheckout(projectPath, branch);
      await get().refreshStatus();
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to checkout:', error);
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },

  createBranch: async (branch: string, checkout = false) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    set({ isLoading: true });
    try {
      await ipc.gitCreateBranch(projectPath, branch);
      if (checkout) {
        await ipc.gitCheckout(projectPath, branch);
      }
      await get().loadBranches();
      await get().refreshStatus();
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },

  deleteBranch: async (branch: string) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitDeleteBranch(projectPath, branch);
      await get().loadBranches();
      return true;
    } catch (error) {
      console.error('Failed to delete branch:', error);
      set({ error: String(error) });
      return false;
    }
  },

  mergeBranch: async (branch: string) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitMerge(projectPath, branch);
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to merge branch:', error);
      set({ error: String(error) });
      return false;
    }
  },

  getDiff: async (file?: string, staged = false) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return;

    try {
      const result = staged
        ? await ipc.gitStagedDiff(projectPath)
        : await ipc.getGitDiff(projectPath, file);
      set({
        diffContent: result.diff,
        diffFile: file || null,
        isStagedDiff: staged,
      });
    } catch (error) {
      console.error('Failed to get diff:', error);
      set({ error: String(error) });
    }
  },

  clearDiff: () => {
    set({ diffContent: '', diffFile: null, isStagedDiff: false });
  },

  loadCommits: async (maxCount = 20) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return;

    set({ commitsLoading: true });
    try {
      const result = await ipc.getGitLog(projectPath, maxCount);
      set({ commits: result.commits, commitsLoading: false });
    } catch (error) {
      console.error('Failed to load commits:', error);
      set({ commitsLoading: false });
    }
  },

  loadStashList: async () => {
    const { projectPath } = get();
    if (!projectPath) {
      set({ stashList: [] });
      return;
    }

    try {
      const result = await ipc.gitStashList(projectPath);
      set({ stashList: result.stashes.map(s => s.message) });
    } catch (error) {
      console.error('Failed to load stash list:', error);
      set({ stashList: [] });
    }
  },

  stash: async (message?: string) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitStash(projectPath, message);
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to stash:', error);
      set({ error: String(error) });
      return false;
    }
  },

  stashPop: async (index?: number) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitStashPop(projectPath, index);
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to pop stash:', error);
      set({ error: String(error) });
      return false;
    }
  },

  stashApply: async (index?: number) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitStashApply(projectPath, index);
      await get().refreshStatus();
      await get().loadStashList();
      return true;
    } catch (error) {
      console.error('Failed to apply stash:', error);
      set({ error: String(error) });
      return false;
    }
  },

  stashDrop: async (index?: number) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitStashDrop(projectPath, index);
      await get().loadStashList();
      return true;
    } catch (error) {
      console.error('Failed to drop stash:', error);
      set({ error: String(error) });
      return false;
    }
  },

  resetFile: async (file: string) => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitResetFile(projectPath, file);
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to reset file:', error);
      set({ error: String(error) });
      return false;
    }
  },

  resetAll: async () => {
    const { gitState, projectPath } = get();
    if (!gitState || !projectPath) return false;

    try {
      await ipc.gitResetAll(projectPath);
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('Failed to reset all:', error);
      set({ error: String(error) });
      return false;
    }
  },

  hardReset: async (_commit?: string) => {
    // Hard reset to a specific commit is intentionally not implemented
    // for safety. Use resetAll() to discard all uncommitted changes instead.
    set({ error: 'Hard reset to a specific commit is not supported for safety reasons. Use "Discard All Changes" instead.' });
    return false;
  },

  selectFile: (file: string) => {
    set((state) => ({
      selectedFiles: [...state.selectedFiles, file],
    }));
  },

  deselectFile: (file: string) => {
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((f) => f !== file),
    }));
  },

  selectAllFiles: () => {
    const { gitState } = get();
    if (!gitState) return;
    const allFiles = [
      ...gitState.modified,
      ...gitState.untracked,
      ...gitState.staged,
    ];
    set({ selectedFiles: allFiles });
  },

  clearSelection: () => {
    set({ selectedFiles: [] });
  },

  openBranchDialog: (mode) => {
    set({ branchDialog: { isOpen: true, mode } });
  },

  closeBranchDialog: () => {
    set({ branchDialog: { isOpen: false, mode: 'create' } });
  },

  openStashDialog: (mode) => {
    set({ stashDialog: { isOpen: true, mode } });
  },

  closeStashDialog: () => {
    set({ stashDialog: { isOpen: false, mode: 'push' } });
  },
}));

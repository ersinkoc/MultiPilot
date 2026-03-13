import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGitStore } from '../gitStore';

// Mock the IPC module
vi.mock('@/lib/ipc', () => ({
  gitStatus: vi.fn().mockResolvedValue({
    branch: 'main',
    tracking: 'origin/main',
    ahead: 0,
    behind: 0,
    modified: [],
    staged: [],
    untracked: [],
    conflicted: [],
  }),
  gitBranches: vi.fn().mockResolvedValue(['main', 'develop']),
  gitCommit: vi.fn().mockResolvedValue({ hash: 'abc123' }),
  stageFiles: vi.fn().mockResolvedValue(undefined),
  unstageFiles: vi.fn().mockResolvedValue(undefined),
  gitPush: vi.fn().mockResolvedValue(undefined),
  gitPull: vi.fn().mockResolvedValue(undefined),
  gitFetch: vi.fn().mockResolvedValue(undefined),
  gitCheckout: vi.fn().mockResolvedValue(undefined),
  gitCreateBranch: vi.fn().mockResolvedValue(undefined),
  gitDeleteBranch: vi.fn().mockResolvedValue(undefined),
  gitMerge: vi.fn().mockResolvedValue(undefined),
  getGitDiff: vi.fn().mockResolvedValue({ diff: 'diff content' }),
  gitStagedDiff: vi.fn().mockResolvedValue({ diff: 'staged diff' }),
  getGitLog: vi.fn().mockResolvedValue({ commits: [] }),
  gitStashList: vi.fn().mockResolvedValue({ stashes: [] }),
  gitStash: vi.fn().mockResolvedValue(undefined),
  gitStashPop: vi.fn().mockResolvedValue(undefined),
  gitStashApply: vi.fn().mockResolvedValue(undefined),
  gitStashDrop: vi.fn().mockResolvedValue(undefined),
  gitResetFile: vi.fn().mockResolvedValue(undefined),
  gitResetAll: vi.fn().mockResolvedValue(undefined),
}));

describe('gitStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGitStore.setState({
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
    });
  });

  describe('setCommitMessage', () => {
    it('should set commit message', () => {
      useGitStore.getState().setCommitMessage('Initial commit');
      expect(useGitStore.getState().commitMessage).toBe('Initial commit');
    });
  });

  describe('clearCommitMessage', () => {
    it('should clear commit message', () => {
      useGitStore.getState().setCommitMessage('Test message');
      useGitStore.getState().clearCommitMessage();
      expect(useGitStore.getState().commitMessage).toBe('');
    });
  });

  describe('selectFile', () => {
    it('should add file to selection', () => {
      useGitStore.getState().selectFile('file1.txt');
      expect(useGitStore.getState().selectedFiles).toContain('file1.txt');
    });

    it('should allow multiple file selection', () => {
      useGitStore.getState().selectFile('file1.txt');
      useGitStore.getState().selectFile('file2.txt');
      expect(useGitStore.getState().selectedFiles).toHaveLength(2);
    });
  });

  describe('deselectFile', () => {
    it('should remove file from selection', () => {
      useGitStore.getState().selectFile('file1.txt');
      useGitStore.getState().selectFile('file2.txt');
      useGitStore.getState().deselectFile('file1.txt');

      const selectedFiles = useGitStore.getState().selectedFiles;
      expect(selectedFiles).not.toContain('file1.txt');
      expect(selectedFiles).toContain('file2.txt');
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected files', () => {
      useGitStore.getState().selectFile('file1.txt');
      useGitStore.getState().selectFile('file2.txt');
      useGitStore.getState().clearSelection();

      expect(useGitStore.getState().selectedFiles).toHaveLength(0);
    });
  });

  describe('dialog management', () => {
    it('should open branch dialog', () => {
      useGitStore.getState().openBranchDialog('create');
      expect(useGitStore.getState().branchDialog.isOpen).toBe(true);
      expect(useGitStore.getState().branchDialog.mode).toBe('create');
    });

    it('should close branch dialog', () => {
      useGitStore.getState().openBranchDialog('create');
      useGitStore.getState().closeBranchDialog();
      expect(useGitStore.getState().branchDialog.isOpen).toBe(false);
    });

    it('should open stash dialog', () => {
      useGitStore.getState().openStashDialog('push');
      expect(useGitStore.getState().stashDialog.isOpen).toBe(true);
      expect(useGitStore.getState().stashDialog.mode).toBe('push');
    });

    it('should close stash dialog', () => {
      useGitStore.getState().openStashDialog('push');
      useGitStore.getState().closeStashDialog();
      expect(useGitStore.getState().stashDialog.isOpen).toBe(false);
    });
  });

  describe('clearDiff', () => {
    it('should clear diff content and file', () => {
      useGitStore.setState({
        diffContent: 'some diff',
        diffFile: 'file.txt',
        isStagedDiff: true,
      });

      useGitStore.getState().clearDiff();

      expect(useGitStore.getState().diffContent).toBe('');
      expect(useGitStore.getState().diffFile).toBeNull();
      expect(useGitStore.getState().isStagedDiff).toBe(false);
    });
  });
});

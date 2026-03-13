import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import type { GitStatus } from './types.js';

export class GitManager {
  private gitInstances: Map<string, SimpleGit> = new Map();

  private getGit(repoPath: string): SimpleGit {
    let git = this.gitInstances.get(repoPath);
    if (!git) {
      git = simpleGit(repoPath);
      this.gitInstances.set(repoPath, git);
    }
    return git;
  }

  async isRepo(repoPath: string): Promise<boolean> {
    try {
      const git = this.getGit(repoPath);
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async getStatus(repoPath: string): Promise<GitStatus> {
    const git = this.getGit(repoPath);

    const [status, branchSummary] = await Promise.all([
      git.status(),
      git.branch(['-vv']),
    ]);

    // Handle detached HEAD: branchSummary.current may be empty or falsy
    const currentBranch = branchSummary.current || status.current || 'HEAD (detached)';
    const branchInfo = branchSummary.branches[currentBranch];
    const tracking = (branchInfo as any)?.tracking || null;

    return {
      branch: currentBranch,
      tracking,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      modified: status.modified,
      staged: status.staged,
      untracked: status.not_added,
      conflicted: status.conflicted,
    };
  }

  async getBranches(repoPath: string): Promise<string[]> {
    const git = this.getGit(repoPath);
    const branches = await git.branch(['-a']);
    return branches.all;
  }

  async stageFiles(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.add(files);
  }

  async unstageFiles(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.reset(['HEAD', ...files]);
  }

  async commit(repoPath: string, message: string): Promise<string> {
    const git = this.getGit(repoPath);
    const result = await git.commit(message);
    if (!result.commit) {
      throw new Error('Nothing to commit. Make sure you have staged changes.');
    }
    return result.commit;
  }

  async push(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.push();
  }

  async pull(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.pull();
  }

  async fetch(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.fetch();
  }

  async checkout(repoPath: string, branch: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(branch);
  }

  async createBranch(repoPath: string, branch: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkoutLocalBranch(branch);
  }

  async deleteBranch(repoPath: string, branch: string, force = false): Promise<void> {
    const git = this.getGit(repoPath);
    await git.deleteLocalBranch(branch, force);
  }

  async resetFile(repoPath: string, file: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(['--', file]);
  }

  async getDiff(repoPath: string, file?: string): Promise<string> {
    const git = this.getGit(repoPath);
    const options = file ? [file] : [];
    return git.diff(options);
  }

  async getStagedDiff(repoPath: string): Promise<string> {
    const git = this.getGit(repoPath);
    return git.diff(['--cached']);
  }

  async stash(repoPath: string, message?: string): Promise<void> {
    const git = this.getGit(repoPath);
    if (message) {
      await git.stash(['push', '-m', message]);
    } else {
      await git.stash(['push']);
    }
  }

  async stashPop(repoPath: string, index?: number): Promise<void> {
    const git = this.getGit(repoPath);
    if (index !== undefined) {
      await git.stash(['pop', `stash@{${index}}`]);
    } else {
      await git.stash(['pop']);
    }
  }

  async merge(repoPath: string, branch: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.merge([branch]);
  }

  async stashApply(repoPath: string, index?: number): Promise<void> {
    const git = this.getGit(repoPath);
    if (index !== undefined) {
      await git.stash(['apply', `stash@{${index}}`]);
    } else {
      await git.stash(['apply']);
    }
  }

  async stashDrop(repoPath: string, index?: number): Promise<void> {
    const git = this.getGit(repoPath);
    if (index !== undefined) {
      await git.stash(['drop', `stash@{${index}}`]);
    } else {
      await git.stash(['drop']);
    }
  }

  async stashList(repoPath: string): Promise<{ index: number; message: string }[]> {
    const git = this.getGit(repoPath);
    const result = await git.stash(['list']);
    if (!result) return [];
    return result.split('\n').filter(Boolean).map((line) => {
      const match = line.match(/^stash@\{(\d+)\}:\s*(.+)$/);
      if (match) {
        return { index: parseInt(match[1], 10), message: match[2] };
      }
      return { index: 0, message: line };
    });
  }

  async resetAll(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(['--', '.']);
    await git.clean('f', ['-d']);
  }

  async getLog(repoPath: string, maxCount = 20): Promise<any[]> {
    const git = this.getGit(repoPath);
    const log = await git.log({ maxCount });
    return log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: commit.date,
    }));
  }
}

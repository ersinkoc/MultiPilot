import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';
import type { FileEntry, FileChangeEvent } from './types.js';

export class FileManager {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private onFileChange: ((event: FileChangeEvent) => void) | null = null;
  private allowedPaths: Set<string> = new Set();

  setFileChangeHandler(handler: (event: FileChangeEvent) => void) {
    this.onFileChange = handler;
  }

  /**
   * Register an allowed project path. All file operations must be within these paths.
   */
  addAllowedPath(projectPath: string): void {
    // Normalize and resolve to absolute path
    const resolved = path.resolve(projectPath);
    this.allowedPaths.add(resolved);
  }

  /**
   * Validate that a file path is within allowed project directories.
   * Prevents path traversal attacks like ../../../etc/passwd
   */
  private validatePath(filePath: string): string {
    const resolved = path.resolve(filePath);

    // Check if path is within any allowed directory
    for (const allowed of this.allowedPaths) {
      // Ensure the resolved path starts with allowed path
      const relative = path.relative(allowed, resolved);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        return resolved;
      }
    }

    throw new Error(`Access denied: Path '${filePath}' is outside allowed directories`);
  }

  async listDirectory(dirPath: string): Promise<FileEntry[]> {
    const validatedPath = this.validatePath(dirPath);
    const entries = await fs.readdir(validatedPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    for (const entry of entries) {
      const fullPath = path.join(validatedPath, entry.name);
      const stats = await fs.stat(fullPath).catch(() => null);

      result.push({
        name: entry.name,
        path: fullPath,
        isDir: entry.isDirectory(),
        size: stats?.isFile() ? stats.size : undefined,
      });
    }

    return result;
  }

  async readFile(filePath: string): Promise<string> {
    const validatedPath = this.validatePath(filePath);
    return fs.readFile(validatedPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const validatedPath = this.validatePath(filePath);
    await fs.ensureDir(path.dirname(validatedPath));
    await fs.writeFile(validatedPath, content, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    const validatedPath = this.validatePath(filePath);
    await fs.remove(validatedPath);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const validatedOldPath = this.validatePath(oldPath);
    const validatedNewPath = this.validatePath(newPath);
    await fs.move(validatedOldPath, validatedNewPath);
  }

  async createDirectory(dirPath: string): Promise<void> {
    const validatedPath = this.validatePath(dirPath);
    await fs.ensureDir(validatedPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const validatedPath = this.validatePath(filePath);
    return fs.pathExists(validatedPath);
  }

  watchProject(projectPath: string, projectId: string): void {
    if (this.watchers.has(projectId)) {
      return;
    }

    // Add to allowed paths when watching
    this.addAllowedPath(projectPath);

    const watcher = chokidar.watch(projectPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/target/**',
        '**/dist/**',
        '**/build/**',
      ],
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('error', (error) => {
        console.error(`[FileManager] Watcher error for project ${projectId}:`, error);
      })
      .on('add', (filePath) => {
        this.onFileChange?.({ event: 'add', path: filePath });
      })
      .on('change', (filePath) => {
        this.onFileChange?.({ event: 'change', path: filePath });
      })
      .on('unlink', (filePath) => {
        this.onFileChange?.({ event: 'unlink', path: filePath });
      })
      .on('addDir', (dirPath) => {
        this.onFileChange?.({ event: 'addDir', path: dirPath });
      })
      .on('unlinkDir', (dirPath) => {
        this.onFileChange?.({ event: 'unlinkDir', path: dirPath });
      });

    this.watchers.set(projectId, watcher);
  }

  unwatchProject(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectId);
    }
  }

  stopAllWatchers(): void {
    for (const [id, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.allowedPaths.clear();
  }
}

import { vi } from 'vitest';

// Mock Tauri API
export const mockTauriIPC = vi.fn();
export const mockTauriEvent = {
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
};

// Mock Tauri shell
export const mockTauriShell = {
  open: vi.fn().mockResolvedValue(undefined),
  Command: {
    create: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
    }),
  },
};

// Mock Tauri fs
export const mockTauriFs = {
  readTextFile: vi.fn().mockResolvedValue(''),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  createDir: vi.fn().mockResolvedValue(undefined),
  removeDir: vi.fn().mockResolvedValue(undefined),
  removeFile: vi.fn().mockResolvedValue(undefined),
  renameFile: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn().mockResolvedValue([]),
};

// Mock Tauri dialog
export const mockTauriDialog = {
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
  message: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(false),
};

// Mock Tauri path
export const mockTauriPath = {
  appDataDir: vi.fn().mockResolvedValue('/mock/appData'),
  appConfigDir: vi.fn().mockResolvedValue('/mock/appConfig'),
  appLocalDataDir: vi.fn().mockResolvedValue('/mock/appLocalData'),
  cacheDir: vi.fn().mockResolvedValue('/mock/cache'),
  homeDir: vi.fn().mockResolvedValue('/mock/home'),
  documentDir: vi.fn().mockResolvedValue('/mock/documents'),
  downloadDir: vi.fn().mockResolvedValue('/mock/downloads'),
  executableDir: vi.fn().mockResolvedValue('/mock/executable'),
  resolve: vi.fn().mockResolvedValue('/mock/resolved'),
};

// Setup global Tauri mocks before tests
export function setupTauriMocks() {
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: mockTauriIPC,
    convertFileSrc: vi.fn().mockReturnValue(''),
  }));

  vi.mock('@tauri-apps/api/event', () => mockTauriEvent);

  vi.mock('@tauri-apps/plugin-shell', () => mockTauriShell);

  vi.mock('@tauri-apps/plugin-fs', () => mockTauriFs);

  vi.mock('@tauri-apps/plugin-dialog', () => mockTauriDialog);

  vi.mock('@tauri-apps/api/path', () => mockTauriPath);

  // Mock window.__TAURI__
  Object.defineProperty(window, '__TAURI__', {
    writable: true,
    value: {
      invoke: mockTauriIPC,
      convertFileSrc: vi.fn(),
    },
  });
}

// Helper to mock specific IPC responses
export function mockIPCResponse<T>(command: string, response: T): void {
  mockTauriIPC.mockImplementation((cmd: string, _args?: unknown) => {
    if (cmd === command) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unexpected command: ${cmd}`));
  });
}

// Helper to clear all IPC mocks
export function clearTauriMocks(): void {
  mockTauriIPC.mockClear();
  mockTauriEvent.listen.mockClear();
  mockTauriEvent.emit.mockClear();
  mockTauriShell.open.mockClear();
  mockTauriFs.readTextFile.mockClear();
  mockTauriFs.writeTextFile.mockClear();
  mockTauriDialog.open.mockClear();
}

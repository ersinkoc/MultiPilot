import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null,
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // WebSocket.OPEN
})) as unknown as typeof WebSocket;

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Filter out specific React warnings that are expected in test environment
  const message = String(args[0]);
  if (
    message.includes('Warning: ReactDOM.render') ||
    message.includes('Warning: act') ||
    message.includes('Warning: An update to') ||
    message.includes('not wrapped in act')
  ) {
    return;
  }
  originalError.apply(console, args);
};

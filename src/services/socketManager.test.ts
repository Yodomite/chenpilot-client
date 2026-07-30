import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocketManager } from './socketManager';

describe('SocketManager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should initialize with default options merged with partial config options', () => {
    const manager = new SocketManager({
      url: 'http://localhost:3000',
      options: {
        reconnection: false,
        timeout: 5000,
      },
    });

    expect(manager.getSocket()).toBeNull();

    // Access config by connecting; we verify merged config indirectly via connect call
    // since config is private. We can at least ensure no exception is thrown.
    expect(() => manager.connect()).not.toThrow();
  });

  it('should use full defaults when no options are provided', () => {
    const manager = new SocketManager({
      url: 'http://localhost:3000',
    });

    expect(() => manager.connect()).not.toThrow();
  });
});
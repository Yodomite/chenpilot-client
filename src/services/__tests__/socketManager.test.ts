import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SocketManager } from '@/services/socketManager';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  const mockSocket = {
    id: 'mock-socket-id' as const,
    connected: true,
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(callback);
      return mockSocket;
    }),
    off: vi.fn((event: string, callback?: (...args: unknown[]) => void) => {
      if (!callback) {
        listeners.delete(event);
      } else {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const idx = eventListeners.indexOf(callback);
          if (idx !== -1) {
            eventListeners.splice(idx, 1);
          }
        }
      }
      return mockSocket;
    }),
    once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      const wrapped = (...args: unknown[]) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const idx = eventListeners.indexOf(wrapped);
          if (idx !== -1) {
            eventListeners.splice(idx, 1);
          }
        }
        callback(...args);
      };
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(wrapped);
      return mockSocket;
    }),
    disconnect: vi.fn(() => {
      const disconnectListeners = listeners.get('disconnect');
      if (disconnectListeners) {
        disconnectListeners.forEach((cb) => cb('io client disconnect'));
      }
    }),
    emit: vi.fn(),
    connect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
    __mockSocket: mockSocket,
    __clearListeners: () => {
      listeners.clear();
    },
    __listeners: listeners,
  };
});

describe('SocketManager', () => {
  let manager: SocketManager;
  const config = {
    url: 'http://localhost:3001',
    options: {
      reconnection: false,
      autoConnect: false,
    },
  };

  beforeEach(async () => {
    // Clear mock state before each test
    const mockModule = (await import('socket.io-client')) as unknown as {
      __clearListeners: () => void;
    };
    mockModule.__clearListeners();
    vi.clearAllMocks();
    manager = new SocketManager(config);
  });

  describe('connect()', () => {
    it('should register all 6 internal event handlers on the socket', () => {
      manager.connect();

      const internalEvents = [
        'connect',
        'disconnect',
        'connect_error',
        'reconnect',
        'reconnect_error',
        'reconnect_failed',
      ];

      for (const event of internalEvents) {
        expect(manager.isEventRegistered(event)).toBe(true);
      }

      expect(manager.getRegisteredEventCount()).toBe(6);
    });

    it('should return a socket instance', () => {
      const socket = manager.connect();
      expect(socket).toBeDefined();
    });
  });

  describe('disconnect()', () => {
    it('should remove all 6 internal event handlers via socket.off()', () => {
      manager.connect();
      const socket = manager.getSocket()!;

      // Verify handlers were registered
      expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect_error', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect_failed', expect.any(Function));

      // Disconnect
      manager.disconnect();

      // Verify socket.off() was called for each internal event with a handler reference
      expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('reconnect_error', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('reconnect_failed', expect.any(Function));

      // Verify socket.disconnect() was called
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should clear the registered events registry after disconnect', () => {
      manager.connect();
      expect(manager.getRegisteredEventCount()).toBe(6);

      manager.disconnect();
      expect(manager.getRegisteredEventCount()).toBe(0);
    });

    it('should set the socket to null after disconnect', () => {
      manager.connect();
      expect(manager.getSocket()).not.toBeNull();

      manager.disconnect();
      expect(manager.getSocket()).toBeNull();
    });

    it('should be a no-op if called when no socket exists', () => {
      // Never connected - socket is null
      expect(() => manager.disconnect()).not.toThrow();
      expect(manager.getRegisteredEventCount()).toBe(0);
    });
  });

  describe('on() / off()', () => {
    it('should track externally-registered events via on()', () => {
      const socket = manager.connect();
      const callback = vi.fn();

      manager.on('custom:event', callback);
      expect(socket.on).toHaveBeenCalledWith('custom:event', callback);
      expect(manager.isEventRegistered('custom:event')).toBe(true);
    });

    it('should remove event from registry when off() is called without callback', () => {
      const socket = manager.connect();
      const callback = vi.fn();

      manager.on('custom:event', callback);
      expect(manager.isEventRegistered('custom:event')).toBe(true);

      manager.off('custom:event');
      expect(socket.off).toHaveBeenCalledWith('custom:event', undefined);
      expect(manager.isEventRegistered('custom:event')).toBe(false);
    });
  });

  describe('once()', () => {
    it('should wrap the callback to auto-remove from registry after first invocation', () => {
      const socket = manager.connect();
      const callback = vi.fn();

      manager.once('once:event', callback);
      expect(manager.isEventRegistered('once:event')).toBe(true);

      // Simulate the event firing - find the wrapped handler and call it
      const onceCall = (socket.once as ReturnType<typeof vi.fn>).mock.calls.find(
        ([event]: [string]) => event === 'once:event'
      );
      expect(onceCall).toBeDefined();

      // Call the wrapped callback
      const wrappedCallback = onceCall![1] as (...args: unknown[]) => void;
      wrappedCallback('arg1', 'arg2');

      // Original callback should have been called
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');

      // Registry should be cleaned up
      expect(manager.isEventRegistered('once:event')).toBe(false);
    });
  });

  describe('isConnected()', () => {
    it('should return false when no socket exists', () => {
      expect(manager.isConnected()).toBe(false);
    });

    it('should return socket.connected value after connect()', () => {
      manager.connect();
      // Mock socket has connected = true
      expect(manager.isConnected()).toBe(true);
    });
  });
});

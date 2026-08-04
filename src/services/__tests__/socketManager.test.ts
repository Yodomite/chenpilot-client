import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocketManager, SocketConfig } from '../socketManager';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    connected: false,
    id: 'mock-socket-id',
  };

  return {
    io: vi.fn(() => mockSocket),
    Socket: vi.fn(),
  };
});

describe('SocketManager', () => {
  let config: SocketConfig;
  let socketManager: SocketManager;

  beforeEach(() => {
    config = {
      url: 'http://localhost:3001',
      options: {
        transports: ['websocket'],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 10000,
      },
    };
    socketManager = new SocketManager(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a SocketManager with provided config', () => {
      expect(socketManager).toBeInstanceOf(SocketManager);
    });

    it('should merge provided options with defaults', () => {
      const manager = new SocketManager({ url: 'http://test.com' });
      // Accessing private config via connect to verify defaults are applied
      const { io } = require('socket.io-client');
      manager.connect();
      expect(io).toHaveBeenCalledWith('http://test.com', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });
    });

    it('should override defaults with provided options', () => {
      const { io } = require('socket.io-client');
      socketManager.connect();
      expect(io).toHaveBeenCalledWith('http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 10000,
      });
    });

    it('should assert default presence when partial options are provided', () => {
      const manager = new SocketManager({
        url: 'http://test.com',
        options: {
          timeout: 15000,
        },
      });
      const { io } = require('socket.io-client');
      manager.connect();
      expect(io).toHaveBeenCalledWith('http://test.com', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 15000,
      });
    });
  });

  describe('connect', () => {
    it('should create a socket connection', () => {
      const { io } = require('socket.io-client');
      const socket = socketManager.connect();

      expect(io).toHaveBeenCalledTimes(1);
      expect(socket).toBeDefined();
    });

    it('should return existing socket if already connected', () => {
      const socket1 = socketManager.connect();
      const socket2 = socketManager.connect();

      const { io } = require('socket.io-client');
      expect(io).toHaveBeenCalledTimes(1);
      expect(socket1).toBe(socket2);
    });

    it('should set up event listeners on connect', () => {
      const socket = socketManager.connect();

      expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect_error', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect_failed', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should disconnect the socket', () => {
      const socket = socketManager.connect();
      socketManager.disconnect();

      expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should set socket to null after disconnect', () => {
      socketManager.connect();
      socketManager.disconnect();

      expect(socketManager.getSocket()).toBeNull();
    });

    it('should not throw if disconnect called without connection', () => {
      expect(() => socketManager.disconnect()).not.toThrow();
    });
  });

  describe('getSocket', () => {
    it('should return null before connect', () => {
      expect(socketManager.getSocket()).toBeNull();
    });

    it('should return socket after connect', () => {
      const socket = socketManager.connect();
      expect(socketManager.getSocket()).toBe(socket);
    });
  });

  describe('isConnected', () => {
    it('should return false before connect', () => {
      expect(socketManager.isConnected()).toBe(false);
    });

    it('should return false when socket is not connected', () => {
      socketManager.connect();
      expect(socketManager.isConnected()).toBe(false);
    });

    it('should return true when socket is connected', () => {
      const { io } = require('socket.io-client');
      const mockSocket = io();
      mockSocket.connected = true;

      socketManager.connect();
      expect(socketManager.isConnected()).toBe(true);
    });
  });

  describe('emit', () => {
    it('should emit event when connected', () => {
      const { io } = require('socket.io-client');
      const mockSocket = io();
      mockSocket.connected = true;

      socketManager.connect();
      socketManager.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should not emit event when not connected', () => {
      const { io } = require('socket.io-client');
      const mockSocket = io();

      socketManager.connect();
      socketManager.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should not throw if emit called without connection', () => {
      expect(() => socketManager.emit('test-event')).not.toThrow();
    });
  });

  describe('on / off / once', () => {
    it('should register event listener', () => {
      const socket = socketManager.connect();
      const callback = vi.fn();

      socketManager.on('test-event', callback);

      expect(socket.on).toHaveBeenCalledWith('test-event', callback);
    });

    it('should remove event listener', () => {
      const socket = socketManager.connect();
      const callback = vi.fn();

      socketManager.off('test-event', callback);

      expect(socket.off).toHaveBeenCalledWith('test-event', callback);
    });

    it('should register one-time event listener', () => {
      const socket = socketManager.connect();
      const callback = vi.fn();

      socketManager.once('test-event', callback);

      expect(socket.once).toHaveBeenCalledWith('test-event', callback);
    });

    it('should not throw if on called without connection', () => {
      expect(() => socketManager.on('test-event', vi.fn())).not.toThrow();
    });

    it('should not throw if off called without connection', () => {
      expect(() => socketManager.off('test-event', vi.fn())).not.toThrow();
    });

    it('should not throw if once called without connection', () => {
      expect(() => socketManager.once('test-event', vi.fn())).not.toThrow();
    });
  });
});

describe('getSocketManager', () => {
  beforeEach(() => {
    // Clear the singleton by re-importing fresh module
    vi.resetModules();
  });

  it('should throw if called without config and no instance exists', () => {
    const { getSocketManager } = require('../socketManager');
    expect(() => getSocketManager()).toThrow('SocketManager not initialized');
  });

  it('should create instance when config is provided', () => {
    const { getSocketManager } = require('../socketManager');
    const manager = getSocketManager({ url: 'http://test.com' });
    expect(manager).toBeInstanceOf(SocketManager);
  });

  it('should return same instance on subsequent calls', () => {
    const { getSocketManager } = require('../socketManager');
    const manager1 = getSocketManager({ url: 'http://test.com' });
    const manager2 = getSocketManager();
    expect(manager1).toBe(manager2);
  });
});

describe('initializeSocketManager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should create a new SocketManager instance', () => {
    const { initializeSocketManager } = require('../socketManager');
    const manager = initializeSocketManager({ url: 'http://test.com' });
    expect(manager).toBeInstanceOf(SocketManager);
  });

  it('should replace existing singleton instance', () => {
    const { initializeSocketManager, getSocketManager } = require('../socketManager');
    const manager1 = initializeSocketManager({ url: 'http://test.com' });
    const manager2 = initializeSocketManager({ url: 'http://other.com' });
    const manager3 = getSocketManager();
    expect(manager2).toBe(manager3);
    expect(manager1).not.toBe(manager2);
  });
});

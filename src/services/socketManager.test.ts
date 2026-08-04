import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketManager } from './socketManager';

const { io, mockSocket } = vi.hoisted(() => {
  const socket = {
    connected: false,
    id: 'mock-socket-id',
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
  };

  return {
    io: vi.fn(() => socket),
    mockSocket: socket,
  };
});

vi.mock('socket.io-client', () => ({
  io,
}));

describe('SocketManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  it('should preserve defaults when only some options are overridden', () => {
    const manager = new SocketManager({
      url: 'http://localhost:3000',
      options: {
        reconnection: false,
        timeout: 5000,
      },
    });

    manager.connect();

    expect(io).toHaveBeenCalledWith('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
    });
  });

  it('should use all defaults when no options are provided', () => {
    const manager = new SocketManager({
      url: 'http://localhost:3000',
    });

    manager.connect();

    expect(io).toHaveBeenCalledWith('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });
  });
});

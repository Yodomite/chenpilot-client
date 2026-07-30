import { io, Socket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  options?: {
    transports?: ('polling' | 'websocket')[];
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionDelay?: number;
    reconnectionAttempts?: number;
    timeout?: number;
  };
  queueEnabled?: boolean;
  maxQueueSize?: number;
}

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  private eventQueue: Array<{ event: string; data?: unknown }> = [];
  private queueEnabled: boolean;
  private maxQueueSize: number;

  constructor(config: SocketConfig) {
    const defaults = {
      transports: ['websocket', 'polling'] as ('polling' | 'websocket')[],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    };

    this.config = {
      ...config,
      options: {
        ...defaults,
        ...(config.options || {}),
      },
    };
    this.queueEnabled = this.config.queueEnabled ?? false;
    this.maxQueueSize = this.config.maxQueueSize ?? 100;
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.config.url, this.config.options);

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after', this.reconnectAttempts, 'attempts');
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data?: unknown): boolean {
    if (this.socket?.connected) {
      try {
        this.socket.emit(event, data);
        return true;
      } catch (error) {
        console.warn('Failed to emit event:', event, error);
        return false;
      }
    }

    if (!this.queueEnabled) {
      console.warn('Socket not connected. Cannot emit event:', event);
      return false;
    }

    if (this.eventQueue.length >= this.maxQueueSize) {
      console.warn('Event queue is full. Dropping event:', event);
      return false;
    }

    this.eventQueue.push({ event, data });
    console.warn('Socket not connected. Event queued:', event);
    return false;
  }

  private flushQueue(): void {
    while (this.eventQueue.length > 0 && this.socket?.connected) {
      const queuedEvent = this.eventQueue[0];

      try {
        this.socket.emit(queuedEvent.event, queuedEvent.data);
        this.eventQueue.shift();
      } catch (error) {
        console.warn('Failed to flush queued event:', queuedEvent.event, error);
        break;
      }
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  once(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }
}

// Singleton instance
let socketManagerInstance: SocketManager | null = null;

export const getSocketManager = (config?: SocketConfig): SocketManager => {
  if (!socketManagerInstance && config) {
    socketManagerInstance = new SocketManager(config);
  }
  if (!socketManagerInstance) {
    throw new Error('SocketManager not initialized. Call getSocketManager with config first.');
  }
  return socketManagerInstance;
};

export const initializeSocketManager = (config: SocketConfig): SocketManager => {
  socketManagerInstance = new SocketManager(config);
  return socketManagerInstance;
};

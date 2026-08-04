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

interface QueuedEvent {
  event: string;
  data?: unknown;
}
type SocketEventHandler = (...args: any[]) => void;

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  private eventQueue: QueuedEvent[] = [];
  private queueEnabled: boolean;
  private maxQueueSize: number;
  private registeredHandlers = new Map<string, Set<SocketEventHandler>>();

  constructor(config: SocketConfig) {
    const defaults = {
      transports: ['websocket', 'polling'] as ('polling' | 'websocket')[],
    const defaultOptions: NonNullable<SocketConfig['options']> = {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    };

    this.config = {
      ...config,
      options: { ...defaults, ...(config.options || {}) },
    };
    this.queueEnabled = this.config.queueEnabled ?? false;
    this.maxQueueSize = this.config.maxQueueSize ?? 100;
  }

  /** Handler for socket 'connect' event. */
  private onConnect = (): void => {
    console.log('Socket connected:', this.socket?.id);
    this.reconnectAttempts = 0;
  };

  /** Handler for socket 'disconnect' event. */
  private onDisconnect = (reason: string): void => {
    console.log('Socket disconnected:', reason);
  };

  /** Handler for socket 'connect_error' event. */
  private onConnectError = (error: Error): void => {
    console.error('Socket connection error:', error);
    this.reconnectAttempts++;
  };

  /** Handler for socket 'reconnect' event. */
  private onReconnect = (attemptNumber: number): void => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    this.reconnectAttempts = 0;
  };

  /** Handler for socket 'reconnect_error' event. */
  private onReconnectError = (error: Error): void => {
    console.error('Socket reconnection error:', error);
  };

  /** Handler for socket 'reconnect_failed' event. */
  private onReconnectFailed = (): void => {
    console.error('Socket reconnection failed after', this.reconnectAttempts, 'attempts');
  };

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.removeRegisteredHandlers(this.socket);
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.config.url, this.config.options);

    this.registerHandler('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.registerHandler('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.registerHandler('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.registerHandler('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.registerHandler('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.registerHandler('reconnect_failed', () => {
      console.error('Socket reconnection failed after', this.reconnectAttempts, 'attempts');
    });

    return this.socket;
  }

  /**
   * Removes all internally-registered listeners from the socket, then
   * disconnects and clears the instance.
   */
  disconnect(): void {
    const socket = this.socket;

    if (!socket) {
      return;
    }

    this.removeRegisteredHandlers(socket);
    socket.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emits an event immediately when connected, or queues it when queueing is
   * enabled. The return value indicates whether the event was sent immediately.
   */
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
    while (this.eventQueue.length > 0) {
      if (!this.socket?.connected) {
        break;
      }

      const queuedEvent = this.eventQueue.shift();
      if (!queuedEvent) {
        break;
      }

      this.socket.emit(queuedEvent.event, queuedEvent.data);
    }
  }

  private registerHandler(event: string, callback: SocketEventHandler): void {
    if (!this.socket) {
      return;
    }

    const handlers = this.registeredHandlers.get(event) ?? new Set<SocketEventHandler>();
    handlers.add(callback);
    this.registeredHandlers.set(event, handlers);
    this.socket.on(event, callback);
  }

  private removeRegisteredHandlers(socket: Socket): void {
    for (const [event, handlers] of this.registeredHandlers) {
      for (const handler of handlers) {
        socket.off(event, handler);
      }
    }
    this.registeredHandlers.clear();
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.registerHandler(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);

      const handlers = this.registeredHandlers.get(event);
      if (handlers) {
        if (callback) {
          handlers.delete(callback);
        } else {
          handlers.clear();
        }

        if (handlers.size === 0) {
          this.registeredHandlers.delete(event);
        }
      }
    }
  }

  once(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      const handlers = this.registeredHandlers.get(event) ?? new Set<SocketEventHandler>();
      handlers.add(callback);
      this.registeredHandlers.set(event, handlers);
      this.socket.once(event, callback);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private registerEvent(event: string): void {
    this.registeredEvents.add(event);
  }

  private isManagerEvent(event: string): event is ManagerEvent {
    return (MANAGER_EVENTS as readonly string[]).includes(event);
  }

  private getHandlerForEvent(event: ManagerEvent): ((...args: unknown[]) => void) | undefined {
    switch (event) {
      case 'connect':
        return this.onConnect;
      case 'disconnect':
        return this.onDisconnect;
      case 'connect_error':
        return this.onConnectError;
      case 'reconnect':
        return this.onReconnect;
      case 'reconnect_error':
        return this.onReconnectError;
      case 'reconnect_failed':
        return this.onReconnectFailed;
      default:
        return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Test helpers
  // ---------------------------------------------------------------------------

  /** @internal Returns the number of tracked registered events (for tests). */
  getRegisteredEventCount(): number {
    return this.registeredEvents.size;
  }

  /** @internal Returns whether a specific event is tracked in the registry (for tests). */
  isEventRegistered(event: string): boolean {
    return this.registeredEvents.has(event);
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

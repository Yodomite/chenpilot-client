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
}

/** Internal events the SocketManager registers on its own socket instance. */
const MANAGER_EVENTS = [
  'connect',
  'disconnect',
  'connect_error',
  'reconnect',
  'reconnect_error',
  'reconnect_failed',
] as const;

type ManagerEvent = (typeof MANAGER_EVENTS)[number];

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  /** Registry tracking all event names this manager has registered on the socket. */
  private registeredEvents = new Set<string>();

  constructor(config: SocketConfig) {
    this.config = {
      options: {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        ...config.options,
      },
      ...config,
    };
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

    this.socket = io(this.config.url, this.config.options);

    // Register internal handlers using named references so they can be removed later.
    this.socket.on('connect', this.onConnect);
    this.registerEvent('connect');

    this.socket.on('disconnect', this.onDisconnect);
    this.registerEvent('disconnect');

    this.socket.on('connect_error', this.onConnectError);
    this.registerEvent('connect_error');

    this.socket.on('reconnect', this.onReconnect);
    this.registerEvent('reconnect');

    this.socket.on('reconnect_error', this.onReconnectError);
    this.registerEvent('reconnect_error');

    this.socket.on('reconnect_failed', this.onReconnectFailed);
    this.registerEvent('reconnect_failed');

    return this.socket;
  }

  /**
   * Removes all internally-registered listeners from the socket, then
   * disconnects and clears the instance.
   */
  disconnect(): void {
    if (this.socket) {
      // Remove every internally-registered event listener via socket.off().
      for (const event of this.registeredEvents) {
        // Only tear down manager-owned handlers – external handlers
        // (registered through this.on()) must be cleaned up by the caller.
        if (this.isManagerEvent(event)) {
          const handler = this.getHandlerForEvent(event);
          if (handler) {
            this.socket.off(event, handler);
          }
        }
      }
      this.registeredEvents.clear();
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

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
      this.registeredEvents.add(event);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
      // If removing all handlers for this event, remove from registry.
      if (!callback) {
        this.registeredEvents.delete(event);
      }
    }
  }

  once(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      // Wrap callback to remove the event from the registry after first invocation,
      // since socket.once auto-removes the handler.
      const wrappedCallback = (...args: unknown[]) => {
        this.registeredEvents.delete(event);
        callback(...args);
      };
      this.socket.once(event, wrappedCallback);
      this.registeredEvents.add(event);
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

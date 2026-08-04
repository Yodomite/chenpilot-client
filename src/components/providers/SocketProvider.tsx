'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { SocketManager, SocketConfig, initializeSocketManager } from '@/services/socketManager';

interface SocketContextType {
  socket: Socket | null;
  socketManager: SocketManager | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => boolean;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  once: (event: string, callback: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  config: SocketConfig;
  configKey?: string;
  autoConnect?: boolean;
}

export function SocketProvider({ children, config, configKey, autoConnect = true }: SocketProviderProps) {
  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs to hold handler references so they can be cleaned up.
  const handleConnectRef = useRef<(() => void) | null>(null);
  const handleDisconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const manager = initializeSocketManager(config);
    setSocketManager(manager);

    if (autoConnect) {
      const socketInstance = manager.connect();
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      manager.on('connect', () => setIsConnected(true));
      manager.on('disconnect', () => setIsConnected(false));
    }

    return () => {
      manager.disconnect();
    };
  }, [configKey, autoConnect]);

  const connect = useCallback(() => {
    if (socketManager) {
      // Remove any stale handlers before reconnecting.
      if (handleConnectRef.current) {
        const sock = socketManager.getSocket();
        if (sock) {
          sock.off('connect', handleConnectRef.current);
        }
        handleConnectRef.current = null;
      }
      if (handleDisconnectRef.current) {
        const sock = socketManager.getSocket();
        if (sock) {
          sock.off('disconnect', handleDisconnectRef.current);
        }
        handleDisconnectRef.current = null;
      }

      const socketInstance = socketManager.connect();
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      socketManager.on('connect', () => setIsConnected(true));
      socketManager.on('disconnect', () => setIsConnected(false));
    }
  }, [socketManager]);

  const disconnect = useCallback(() => {
    if (socketManager) {
      // Remove handler refs before disconnecting.
      const sock = socketManager.getSocket();
      if (sock) {
        if (handleConnectRef.current) {
          sock.off('connect', handleConnectRef.current);
        }
        if (handleDisconnectRef.current) {
          sock.off('disconnect', handleDisconnectRef.current);
        }
      }
      handleConnectRef.current = null;
      handleDisconnectRef.current = null;

      socketManager.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socketManager]);

  const emit = (event: string, data?: any): boolean => {
    return socketManager?.emit(event, data) ?? false;
  };

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socketManager?.on(event, callback);
    },
    [socketManager]
  );

  const off = useCallback(
    (event: string, callback?: (...args: unknown[]) => void) => {
      socketManager?.off(event, callback);
    },
    [socketManager]
  );

  const once = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socketManager?.once(event, callback);
    },
    [socketManager]
  );

  const value: SocketContextType = {
    socket,
    socketManager,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

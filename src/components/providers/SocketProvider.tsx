'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const connect = () => {
    if (socketManager) {
      const socketInstance = socketManager.connect();
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      socketManager.on('connect', () => setIsConnected(true));
      socketManager.on('disconnect', () => setIsConnected(false));
    }
  };

  const disconnect = () => {
    if (socketManager) {
      socketManager.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: any): boolean => {
    return socketManager?.emit(event, data) ?? false;
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketManager?.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socketManager?.off(event, callback);
  };

  const once = (event: string, callback: (...args: any[]) => void) => {
    socketManager?.once(event, callback);
  };

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

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

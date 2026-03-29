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
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  once: (event: string, callback: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  config: SocketConfig;
  autoConnect?: boolean;
}

export function SocketProvider({ children, config, autoConnect = true }: SocketProviderProps) {
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

      // Update connection status
      socketInstance.on('connect', () => setIsConnected(true));
      socketInstance.on('disconnect', () => setIsConnected(false));
    }

    return () => {
      if (autoConnect) {
        manager.disconnect();
      }
    };
  }, [config, autoConnect]);

  const connect = () => {
    if (socketManager) {
      const socketInstance = socketManager.connect();
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      socketInstance.on('connect', () => setIsConnected(true));
      socketInstance.on('disconnect', () => setIsConnected(false));
    }
  };

  const disconnect = () => {
    if (socketManager) {
      socketManager.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    socketManager?.emit(event, data);
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

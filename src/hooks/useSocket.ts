import { useEffect } from 'react';
import { useSocket as useSocketContext } from '@/components/providers/SocketProvider';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const context = useSocketContext();
  
  return {
    socket: context.socket,
    socketManager: context.socketManager,
    isConnected: context.isConnected,
    connect: context.connect,
    disconnect: context.disconnect,
    emit: context.emit,
    on: context.on,
    off: context.off,
    once: context.once,
  };
}

export function useSocketEvent(event: string, callback: (...args: any[]) => void) {
  const { socket, on, off } = useSocket();

  useEffect(() => {
    if (socket) {
      on(event, callback);
      
      return () => {
        off(event, callback);
      };
    }
  }, [socket, event, callback, on, off]);
}

export function useSocketConnection() {
  const { isConnected, connect, disconnect } = useSocket();
  
  return {
    isConnected,
    connect,
    disconnect,
  };
}

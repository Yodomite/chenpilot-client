import { useEffect, useRef } from 'react';
import { useSocket as useSocketContext } from '@/components/providers/SocketProvider';

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

export function useSocketEvent(event: string, callback: (...args: unknown[]) => void) {
  const { socket, on, off } = useSocket();
  const callbackRef = useRef(callback);

  // Keep ref updated with latest callback
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Stable listener function that delegates to the ref
  const stableListener = (...args: unknown[]) => {
    callbackRef.current(...args);
  };

  useEffect(() => {
    if (socket) {
      on(event, stableListener);
      
      return () => {
        off(event, stableListener);
      };
    }
  }, [socket, event, on, off]);
}

export function useSocketConnection() {
  const { isConnected, connect, disconnect } = useSocket();
  
  return {
    isConnected,
    connect,
    disconnect,
  };
}
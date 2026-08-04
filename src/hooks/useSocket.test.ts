import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocketEvent, useSocketConnection } from './useSocket';

type SocketClient = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connected: boolean;
};

interface MockContext {
  socket: SocketClient | null;
  isConnected: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
}

const createMockContext = (opts?: {
  socket?: SocketClient | null;
  on?: ReturnType<typeof vi.fn>;
  off?: ReturnType<typeof vi.fn>;
  isConnected?: boolean;
  connect?: ReturnType<typeof vi.fn>;
  disconnect?: ReturnType<typeof vi.fn>;
}): MockContext => {
  const isConnected = opts?.isConnected !== undefined ? opts.isConnected : opts?.socket?.connected || false;

  return {
    socket: opts?.socket || null,
    connect: opts?.connect || opts?.socket?.connect || vi.fn(),
    disconnect: opts?.disconnect || opts?.socket?.disconnect || vi.fn(),
    emit: vi.fn(),
    on: opts?.on || vi.fn(),
    off: opts?.off || vi.fn(),
    once: vi.fn(),
    isConnected,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedSocketContext: any;

vi.mock('@/components/providers/SocketProvider', () => ({
  useSocket: () => capturedSocketContext,
}));

describe('useSocketEvent', () => {
  beforeEach(() => {
    capturedSocketContext = createMockContext({
      socket: {
        on: vi.fn(),
        off: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        connected: true,
      } as unknown as SocketClient,
      on: vi.fn(),
      off: vi.fn(),
    });
  });

  it('subscribes on mount and unsubscribes on unmount via stable listener', () => {
    const on = capturedSocketContext.on as ReturnType<typeof vi.fn>;
    const off = capturedSocketContext.off as ReturnType<typeof vi.fn>;

    const { unmount } = renderHook(() => useSocketEvent('message', vi.fn()));

    expect(on).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenNthCalledWith(1, 'message', expect.any(Function));

    unmount();

    expect(off).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenNthCalledWith(1, 'message', expect.any(Function));
  });

  it('does not unsubscribe/resubscribe when callback changes', () => {
    const on = capturedSocketContext.on as ReturnType<typeof vi.fn>;
    const off = capturedSocketContext.off as ReturnType<typeof vi.fn>;

    const { rerender } = renderHook(({ cb }) => useSocketEvent('message', cb), {
      initialProps: { cb: vi.fn() },
    });

    const listener1 = on.mock.calls[0][1] as (...args: unknown[]) => void;

    rerender({ cb: vi.fn() });

    // listener should be stable across rerenders
    const listener2 = on.mock.calls[0][1] as (...args: unknown[]) => void;
    expect(listener2).toBe(listener1);

    expect(on).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledTimes(0);
  });

  it('calls the latest callback via ref when event received', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(({ eventCb }) => useSocketEvent('message', eventCb), {
      initialProps: { eventCb: cb },
    });

    const listener = (capturedSocketContext.on as ReturnType<typeof vi.fn>).mock.calls[0][1] as (...args: unknown[]) => void;

    listener('hello');

    expect(cb).toHaveBeenCalledWith('hello');

    const cb2 = vi.fn();
    rerender({ eventCb: cb2 });

    listener('world');

    expect(cb).toBeCalledTimes(1);
    expect(cb2).toBeCalledTimes(1);
  });
});

describe('useSocketConnection', () => {
  it('returns connection controls', () => {
    const connect = vi.fn();
    const disconnect = vi.fn();
    capturedSocketContext = createMockContext({
      isConnected: true,
      connect,
      disconnect,
    });

    const { result } = renderHook(() => useSocketConnection());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connect).toBe(connect);
    expect(result.current.disconnect).toBe(disconnect);
  });
});

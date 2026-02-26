"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type Subscriber = () => void;

interface RealtimeContextType {
  subscribe: (callback: Subscriber) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

interface RealtimeProviderProps {
  projectUuid: string;
  children: ReactNode;
}

export function RealtimeProvider({ projectUuid, children }: RealtimeProviderProps) {
  const subscribersRef = useRef<Set<Subscriber>>(new Set());

  const notify = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let debounceTimer: NodeJS.Timeout;

    let lastNotifyTime = 0;
    const THROTTLE_MS = 3000;  // At most 1 refresh every 3 seconds
    const DEBOUNCE_MS = 1000;  // Wait 1s of silence before refreshing

    function connect() {
      // Close any existing connection before opening a new one
      disconnect();
      es = new EventSource(`/api/events?projectUuid=${projectUuid}`);
      es.onmessage = () => {
        clearTimeout(debounceTimer);
        const now = Date.now();
        const elapsed = now - lastNotifyTime;

        if (elapsed >= THROTTLE_MS) {
          // Enough time has passed — refresh immediately
          lastNotifyTime = now;
          notify();
        } else {
          // Too soon — schedule a deferred refresh
          debounceTimer = setTimeout(() => {
            lastNotifyTime = Date.now();
            notify();
          }, Math.max(DEBOUNCE_MS, THROTTLE_MS - elapsed));
        }
      };
      es.onerror = () => {
        // Browser EventSource auto-reconnects on error
      };
    }

    function disconnect() {
      if (es) {
        es.close();
        es = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        connect();
        notify();
      } else {
        disconnect();
      }
    }

    connect();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disconnect();
      clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [projectUuid, notify]);

  const subscribe = useCallback((callback: Subscriber) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // Memoize context value to avoid unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Subscribe a callback to SSE events. The callback fires on mount (initial)
 * and on every subsequent SSE event from the project stream.
 * No-ops gracefully if called outside RealtimeProvider (e.g. during initial layout render).
 */
export function useRealtimeEvent(callback: () => void) {
  const context = useContext(RealtimeContext);

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!context) return;
    const handler = () => callbackRef.current();
    // Fire on mount for initial data fetch
    handler();
    return context.subscribe(handler);
  }, [context]);
}

/**
 * Convenience hook: calls router.refresh() on every SSE event.
 */
export function useRealtimeRefresh() {
  const router = useRouter();
  useRealtimeEvent(() => {
    router.refresh();
  });
}

"use client";

import { io, type Socket } from "socket.io-client";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";

type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

type SocketContextValue = {
  socket: Socket | null;
  connectionState: ConnectionState;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connectionState: "disconnected",
});

export function usePlatformSocket() {
  return useContext(SocketContext);
}

function getSocketUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
  return api.replace(/\/api\/?$/, "");
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnectionState("connected"));
    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("reconnect_attempt", () => setConnectionState("reconnecting"));
    socket.on("reconnect", () => setConnectionState("connected"));
    socket.on("connect_error", () => setConnectionState("disconnected"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionState("disconnected");
    };
  }, [isAuthenticated, token]);

  const value = useMemo(
    () => ({ socket: socketRef.current, connectionState }),
    [connectionState],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
) {
  const { socket } = usePlatformSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

import { useEffect, useRef, useState } from "react";
import type { WsEvent } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL || `${location.origin.replace(/^http/, "ws")}/ws/detections`;

/**
 * Se conecta a /ws/detections (app/websockets/router.py) y expone el último
 * evento recibido. El backend transmite detecciones_frame e
 * incumplimiento_iniciado/_actualizado/_resuelto (ver detection_orchestrator.py).
 */
export function useDetectionsSocket(enabled: boolean) {
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        setLastEvent(JSON.parse(event.data) as WsEvent);
      } catch {
        // mensaje no-JSON inesperado: se ignora
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [enabled]);

  return { lastEvent, connected };
}

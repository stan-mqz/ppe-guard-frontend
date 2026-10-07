import { useEffect, useRef } from "react";
import type { WsEvent } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL || `${location.origin.replace(/^http/, "ws")}/ws/detections`;
const REINTENTO_MS = 2000;

/**
 * Se conecta a /ws/detections (app/websockets/router.py) y entrega cada evento
 * a `onEvento`. El socket es de un solo sentido, no pide token y no envía
 * estado inicial: solo llegan los eventos que ocurran desde la conexión
 * (estudiante_identificado, fase_cambiada, detecciones_frame,
 * asistencia_registrada). Si se cae, reintenta cada 2 s.
 */
export function useDetectionsSocket(onEvento: (evento: WsEvent) => void, enabled = true) {
  // El handler vive en un ref para no reconectar cada vez que cambia.
  const handler = useRef(onEvento);
  handler.current = onEvento;

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reintento: ReturnType<typeof setTimeout>;
    let cerrado = false;

    const conectar = () => {
      socket = new WebSocket(WS_URL);
      socket.onmessage = (event) => {
        try {
          handler.current(JSON.parse(event.data) as WsEvent);
        } catch {
          // mensaje no-JSON inesperado: se ignora
        }
      };
      socket.onclose = () => {
        if (!cerrado) reintento = setTimeout(conectar, REINTENTO_MS);
      };
    };
    conectar();

    // Obligatorio: StrictMode monta el efecto dos veces y sin esto quedarían dos conexiones.
    return () => {
      cerrado = true;
      clearTimeout(reintento);
      socket?.close();
    };
  }, [enabled]);
}

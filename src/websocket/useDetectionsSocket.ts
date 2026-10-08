import { useEffect, useRef } from "react";
import { renovarSesion } from "@/api/auth";
import { urlSocket } from "@/api/config";
import type { WsEvent } from "@/types";

const REINTENTO_MS = 2000;

/**
 * Se conecta a /ws/detections?token= (app/websockets/router.py) y entrega cada
 * evento a `onEvento`. El socket es de un solo sentido. El primer mensaje de
 * cada conexión es `estado_inicial` (la foto de la práctica en ese instante);
 * después llegan estudiante_identificado, fase_cambiada, detecciones_frame y
 * asistencia_registrada. Si se cae, reintenta cada 2 s.
 *
 * Si el servidor rechaza la conexión (token inválido o rol alumno: cierre 1008,
 * que el navegador muestra como un onclose sin onopen) no se reintenta en
 * bucle: se renueva el token y, si con el token nuevo tampoco abre, se avisa
 * con `onRechazado`. Un token vencido termina en /login (interceptor de apiClient).
 */
export function useDetectionsSocket(
  onEvento: (evento: WsEvent) => void,
  enabled = true,
  onRechazado?: () => void,
) {
  // Los handlers viven en refs para no reconectar cada vez que cambian.
  const handler = useRef(onEvento);
  handler.current = onEvento;
  const rechazado = useRef(onRechazado);
  rechazado.current = onRechazado;

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reintento: ReturnType<typeof setTimeout>;
    let cerrado = false;
    let rechazos = 0;

    const conectar = () => {
      let abierto = false;
      socket = new WebSocket(urlSocket());
      socket.onopen = () => {
        abierto = true;
        rechazos = 0;
      };
      socket.onmessage = (event) => {
        try {
          handler.current(JSON.parse(event.data) as WsEvent);
        } catch {
          // mensaje no-JSON inesperado: se ignora
        }
      };
      socket.onclose = async () => {
        if (cerrado) return;
        if (abierto) {
          reintento = setTimeout(conectar, REINTENTO_MS);
          return;
        }
        // Nunca abrió: o el servidor está caído o rechazó el token.
        rechazos += 1;
        if (rechazos > 1) return rechazado.current?.(); // ni con el token recién renovado
        const renovado = await renovarSesion(true);
        if (cerrado) return;
        if (renovado) return conectar();
        // No se pudo renovar (servidor caído): se sigue reintentando como siempre.
        rechazos = 0;
        reintento = setTimeout(conectar, REINTENTO_MS);
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

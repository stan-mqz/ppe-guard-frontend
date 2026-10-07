import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoCamara = "inactiva" | "solicitando" | "activa" | "denegada" | "interrumpida";

/** Cámara del navegador (getUserMedia). El <video> debe usar `videoRef`. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const turno = useRef(0);
  const [estado, setEstado] = useState<EstadoCamara>("inactiva");

  const detener = useCallback(() => {
    turno.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEstado("inactiva");
  }, []);

  const iniciar = useCallback(async (): Promise<boolean> => {
    const miTurno = ++turno.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEstado("solicitando");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia no disponible");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (miTurno !== turno.current) {
        // Se desmontó o se volvió a pedir mientras el navegador preguntaba.
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current === stream) setEstado("interrumpida");
      });
      setEstado("activa");
      return true;
    } catch {
      if (miTurno === turno.current) setEstado("denegada");
      return false;
    }
  }, []);

  // El <video> puede montarse después de obtener el stream: se enlaza en cada render.
  useEffect(() => {
    const video = videoRef.current;
    if (video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => undefined);
    }
  });

  useEffect(
    () => () => {
      turno.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  /** Fotograma actual como JPEG (data URL), o null si aún no hay imagen. */
  const capturar = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  return { videoRef, estado, iniciar, detener, capturar };
}

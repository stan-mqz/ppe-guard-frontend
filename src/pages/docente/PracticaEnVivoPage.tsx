import clsx from "clsx";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Pause,
  ShieldCheck,
  Square,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { STREAM_URL, USE_MOCKS } from "@/api/config";
import { obtenerHealth } from "@/api/health";
import { obtenerMateria } from "@/api/materiasDetalle";
import { finalizarPractica, obtenerPractica, obtenerReporte } from "@/api/practicas";
import { ErrorState } from "@/components/AsyncState";
import { Button, buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IncidentCard } from "@/components/IncidentCard";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useCamera } from "@/hooks/useCamera";
import type { DeteccionItem } from "@/types";
import type { ReporteDetalle } from "@/types/portal";
import { formatHora } from "@/utils/format";
import { etiquetaSeccion } from "@/utils/materia";
import { useDetectionsSocket } from "@/websocket/useDetectionsSocket";

/** Los cuatro estados del panel de video, todos en esta misma ruta. */
type Vista = "en_vivo" | "finalizada" | "interrumpida" | "completada";

const INTERVALO_REPORTE_MS = 2500;

// ---------------------------------------------------------------------------
// Paneles
// ---------------------------------------------------------------------------

/** Cajas de detección que envía el backend por /ws/detections (coordenadas normalizadas). */
const Detecciones = ({ items }: { items: DeteccionItem[] }) => (
  <>
    {items.map((d, i) => {
      const [x1, y1, x2, y2] = d.bbox_norm;
      return (
        <div
          key={d.track_id ?? i}
          className={clsx("absolute border-2", d.is_violation ? "border-red-500" : "border-emerald-400")}
          style={{ left: `${x1 * 100}%`, top: `${y1 * 100}%`, width: `${(x2 - x1) * 100}%`, height: `${(y2 - y1) * 100}%` }}
        >
          <span
            className={clsx(
              "absolute -top-5 left-0 whitespace-nowrap px-1 text-[10px] font-bold text-white",
              d.is_violation ? "bg-red-500" : "bg-emerald-500",
            )}
          >
            {d.class_name} {Math.round(d.confidence * 100)}%
          </span>
        </div>
      );
    })}
  </>
);

function PanelCompletada({ reporte, lugar, reporteUrl }: { reporte: ReporteDetalle | null; lugar: string; reporteUrl: string }) {
  const pct = reporte && reporte.presentes > 0 ? Math.round((reporte.cumplieron / reporte.presentes) * 100) : null;
  const alertas = reporte?.no_cumplieron ?? 0;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-4 bg-emerald-50 p-10 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Award className="h-10 w-10" aria-hidden="true" />
        </span>
        <p className="text-2xl font-bold uppercase text-emerald-700">
          {pct === null ? "Sin asistencias registradas" : `${pct}% cumplimiento EPP`}
        </p>
        {reporte && (
          <p className="text-sm text-emerald-700/80">
            {reporte.cumplieron} de {reporte.presentes} alumnos presentes portaron la indumentaria completa.
          </p>
        )}
      </div>

      <div className="space-y-5 p-8">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Resumen de sesión biométrica</p>
          <h2 className="text-xl font-bold text-slate-800">Cierre de Registro de Seguridad</h2>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Docente Supervisor</dt>
            <dd className="font-semibold text-slate-800">{reporte?.docente_nombre ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Alertas de la sesión</dt>
            <dd className={clsx("font-semibold", alertas === 0 ? "text-emerald-600" : "text-amber-600")}>
              {alertas === 0 ? "Sin incumplimientos" : `${alertas} incumplimiento${alertas === 1 ? "" : "s"} de EPP`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Punto de Control</dt>
            <dd className="font-semibold text-slate-800">{lugar}</dd>
          </div>
        </dl>
        <Link to={reporteUrl} className={buttonClass("primary", "w-full")}>
          Ver reporte de la práctica
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export const PracticaEnVivoPage = () => {
  const { practicaId } = useParams();
  const inicial = useAsync(
    async () => {
      const practica = await obtenerPractica(practicaId!);
      return { practica, materia: await obtenerMateria(practica.materia_id) };
    },
    [practicaId],
    "No se pudo cargar la práctica",
  );
  const practica = inicial.data?.practica;
  const materia = inicial.data?.materia;

  const [vista, setVista] = useState<Vista>("en_vivo");
  const [reporte, setReporte] = useState<ReporteDetalle | null>(null);
  const [ultimoCuadro, setUltimoCuadro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState<string | null>(null);

  // Con el backend real la imagen es el MJPEG de la cámara IA del servidor; con
  // datos de demostración no hay servidor de video y se usa la cámara del navegador.
  const camara = useCamera();
  const { iniciar: iniciarCamara, detener: detenerCamara, capturar } = camara;
  const [streamKey, setStreamKey] = useState(0);
  const { lastEvent } = useDetectionsSocket(!USE_MOCKS && vista === "en_vivo" && Boolean(practica));
  const detecciones = lastEvent?.evento === "detecciones_frame" ? lastEvent.items : [];

  const enVivo = vista === "en_vivo";
  const yaFinalizada = practica?.estado === "finalizada";

  // Una práctica ya cerrada (p. ej. al recargar) abre directo en el resumen.
  useEffect(() => {
    if (yaFinalizada) setVista("completada");
  }, [yaFinalizada]);

  const conectar = useCallback(async () => {
    setDiagnostico(null);
    if (USE_MOCKS) {
      // Si la cámara falla, el efecto de más abajo pasa a "interrumpida".
      if (await iniciarCamara()) setVista("en_vivo");
    } else {
      setStreamKey((k) => k + 1);
      setVista("en_vivo");
    }
  }, [iniciarCamara]);

  const practicaActiva = practica?.estado === "activa";
  useEffect(() => {
    if (practicaActiva) void conectar();
  }, [practicaActiva, conectar]);

  useEffect(() => {
    if (USE_MOCKS && enVivo && (camara.estado === "interrumpida" || camara.estado === "denegada")) {
      setVista("interrumpida");
    }
  }, [camara.estado, enVivo]);

  // Contadores e incidencias: se refrescan mientras la práctica sigue en vivo.
  const cargarReporte = useCallback(
    () => obtenerReporte(practicaId!).then(setReporte).catch(() => undefined),
    [practicaId],
  );
  const hayPractica = Boolean(practica);
  useEffect(() => {
    if (!hayPractica) return;
    void cargarReporte();
    if (!enVivo) return;
    const id = setInterval(cargarReporte, INTERVALO_REPORTE_MS);
    return () => clearInterval(id);
  }, [hayPractica, enVivo, cargarReporte]);

  const finalizar = async () => {
    setFinalizando(true);
    setErrorFinalizar(null);
    try {
      await finalizarPractica(practicaId!);
      setUltimoCuadro(capturar());
      detenerCamara();
      await cargarReporte();
      setConfirmando(false);
      setVista("finalizada");
    } catch (error) {
      setErrorFinalizar(getApiErrorMessage(error, "No se pudo finalizar la práctica."));
    } finally {
      setFinalizando(false);
    }
  };

  const diagnosticar = async () => {
    setDiagnostico("Comprobando la red...");
    if (!navigator.onLine) return setDiagnostico("Este equipo no tiene conexión de red.");
    try {
      await obtenerHealth();
      setDiagnostico("El servidor responde con normalidad: el problema está en la cámara. Verifique que esté conectada y que ninguna otra aplicación la esté usando.");
    } catch {
      setDiagnostico("No se obtuvo respuesta del servidor de PPE Guard. Revise la red del laboratorio.");
    }
  };

  const cortarEnlace = () => {
    detenerCamara();
    setVista("interrumpida");
  };

  const refInterrumpida = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (vista === "interrumpida") refInterrumpida.current?.focus();
  }, [vista]);

  if (inicial.loading || inicial.error) {
    return (
      <>
        <Topbar title="Práctica de Laboratorio" />
        <div className="p-8">
          {inicial.error ? (
            <ErrorState message={inicial.error} onRetry={inicial.reload} />
          ) : (
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
          )}
        </div>
      </>
    );
  }

  const presentes = reporte?.presentes ?? null;
  const incidencias = (reporte?.detalle ?? [])
    .filter((f) => f.presente && f.hora_identificacion)
    .sort((a, b) => Date.parse(b.hora_identificacion!) - Date.parse(a.hora_identificacion!))
    .slice(0, 4);

  return (
    <>
      <Topbar
        eyebrow={etiquetaSeccion(materia!)}
        title={`${practica!.numero ? `Práctica #${practica!.numero}: ` : ""}${practica!.tema ?? materia!.nombre}`}
        pill={
          vista === "interrumpida" ? (
            <StatusPill tone="danger">Conexión interrumpida</StatusPill>
          ) : vista === "completada" ? (
            <StatusPill>Práctica completada</StatusPill>
          ) : vista === "finalizada" ? (
            <StatusPill tone="neutral">Práctica finalizada</StatusPill>
          ) : undefined
        }
        actions={
          vista === "interrumpida" ? (
            <Button variant="outline" className="h-9" onClick={conectar}>
              Reintentar enlace
            </Button>
          ) : enVivo ? (
            <Button variant="danger" className="h-9" onClick={() => setConfirmando(true)}>
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Finalizar práctica
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={UserCheck} label="Alumnos presentes" value={presentes} />
          <StatCard icon={ShieldCheck} label="Cumplen indumentaria" value={reporte?.cumplieron ?? null} tone="success" />
          <StatCard icon={UserX} label="Ausentes" value={reporte?.ausentes ?? null} tone="neutral" />
          <StatCard
            icon={AlertTriangle}
            label="Incumplimientos"
            value={reporte?.no_cumplieron ?? null}
            tone="warning"
            dimmed={vista === "interrumpida"}
          />
        </div>

        {vista === "completada" ? (
          <PanelCompletada
            reporte={reporte}
            lugar={materia!.aula}
            reporteUrl={`/app/reportes/${materia!._id}/practicas/${practica!._id}`}
          />
        ) : (
          <div className="relative aspect-video max-h-[60vh] w-full overflow-hidden rounded-2xl bg-[#0F172A]">
            {enVivo &&
              (USE_MOCKS ? (
                <video ref={camara.videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <img
                  key={streamKey}
                  src={`${STREAM_URL}?t=${streamKey}`}
                  alt="Cámara IA del laboratorio"
                  onError={() => setVista("interrumpida")}
                  className="h-full w-full object-cover"
                />
              ))}

            {enVivo && (
              <>
                <Detecciones items={detecciones} />
                <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  EN VIVO • InduDetect analizando EPP
                </span>
                <span className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                  {materia!.aula}
                </span>
                {USE_MOCKS && (
                  <button
                    type="button"
                    onClick={cortarEnlace}
                    className="absolute bottom-4 right-4 rounded-md bg-black/60 px-2 py-1 text-xs text-white/80 hover:text-white"
                  >
                    Demo: simular corte de conexión
                  </button>
                )}
              </>
            )}

            {vista === "finalizada" && (
              <>
                {ultimoCuadro && (
                  <img src={ultimoCuadro} alt="" className="h-full w-full scale-105 object-cover blur-md" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand/80 p-6 text-center text-white">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-brand-dark">
                    <Pause className="h-9 w-9" aria-hidden="true" />
                  </span>
                  <p className="text-2xl font-bold uppercase tracking-wide">Práctica finalizada</p>
                  <p className="text-sm text-white/80">El análisis de indumentaria se realizó correctamente</p>
                  <Button variant="accent" onClick={() => setVista("completada")}>
                    Ver cierre de la sesión
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            {vista === "interrumpida" && (
              <div
                ref={refInterrumpida}
                tabIndex={-1}
                role="alert"
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white outline-none"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                  <AlertTriangle className="h-9 w-9" aria-hidden="true" />
                </span>
                <p className="text-2xl font-bold">Se perdió la conexión</p>
                <p className="max-w-md text-sm text-slate-300">
                  No se recibe señal de la cámara del laboratorio. La práctica sigue abierta: los registros
                  ya validados se conservan y la detección se reanuda al recuperar el enlace.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="accent" onClick={conectar}>
                    Reintentar Conexión
                  </Button>
                  <Button variant="secondary" onClick={diagnosticar}>
                    Diagnóstico de red
                  </Button>
                </div>
                {diagnostico && <p className="max-w-md text-xs text-slate-300">{diagnostico}</p>}
              </div>
            )}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Historial de incidencias recientes</h2>
          {incidencias.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              {reporte ? "Aún no se ha identificado a ningún alumno." : "Cargando registros..."}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {incidencias.map((f) => (
                <IncidentCard
                  key={f.alumno_id}
                  tipo={f.cumplio_indumentaria ? "ok" : "falta"}
                  nombre={f.nombre}
                  descripcion={
                    f.cumplio_indumentaria
                      ? "Acceso validado facialmente"
                      : `Falta ${f.faltantes.join(", ") || "EPP reglamentario"}`
                  }
                  hora={formatHora(f.hora_identificacion!)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmando}
        title="¿Finalizar la práctica?"
        confirmLabel="Finalizar práctica"
        busy={finalizando}
        error={errorFinalizar}
        onConfirm={finalizar}
        onCancel={() => setConfirmando(false)}
      >
        Se detendrá la cámara IA y se cerrará el registro de asistencia. Los alumnos que no hayan sido
        identificados quedarán como ausentes.
      </ConfirmDialog>
    </>
  );
};

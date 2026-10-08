import { Shirt } from "lucide-react";
import { useParams } from "react-router-dom";
import { listarMisAsistencias, listarMisMaterias } from "@/api/alumno";
import { urlEvidencia } from "@/api/config";
import { BackLink } from "@/components/BackLink";
import { Card, Eyebrow, Skeleton } from "@/components/Card";
import { DataTable, type Column } from "@/components/DataTable";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { AsistenciaAlumno } from "@/types";
import type { MateriaAlumnoVista } from "@/types/portal";
import { formatFecha, formatHora } from "@/utils/format";
import { eppDetectado, listaEpp } from "@/utils/materia";

interface FilaHistorial {
  asistencia: AsistenciaAlumno;
  /** Solo si el alumno sigue matriculado: de ahí salen el aula y el EPP. */
  materia?: MateriaAlumnoVista;
}

/**
 * Accesos del alumno (GET /alumno/asistencias ya los trae del más reciente al
 * más antiguo, con materia y docente) junto con sus materias actuales.
 */
async function cargarHistorial() {
  const [materias, asistencias] = await Promise.all([listarMisMaterias(), listarMisAsistencias()]);
  const porId = new Map(materias.map((m) => [m._id, m]));
  const filas: FilaHistorial[] = asistencias.map((asistencia) => ({
    asistencia,
    materia: porId.get(asistencia.materia_id ?? ""),
  }));
  return { materias, filas };
}

const Estatus = ({ asistencia, materia }: FilaHistorial) => {
  const falta = !asistencia.cumplio_indumentaria;
  const detectado = eppDetectado(materia?.epp ?? [], asistencia.faltantes);
  return (
    <span className={`flex items-center gap-2 ${falta ? "font-semibold text-red-500" : "text-slate-700"}`}>
      <Shirt className="h-4 w-4 shrink-0" aria-hidden="true" />
      {falta
        ? `Falta ${listaEpp(asistencia.faltantes) || "EPP reglamentario"}`
        : listaEpp(detectado) || "Indumentaria completa"}
      {asistencia.evidencia_url && (
        <a
          href={urlEvidencia(asistencia.evidencia_url)}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-brand hover:underline"
        >
          Ver evidencia
        </a>
      )}
    </span>
  );
};

const COLUMNAS: Column<FilaHistorial>[] = [
  {
    header: "Fecha",
    cell: (f) => <span className="font-semibold text-slate-800">{formatFecha(f.asistencia.hora_identificacion)}</span>,
  },
  { header: "Hora", cell: (f) => formatHora(f.asistencia.hora_identificacion), className: "text-slate-500" },
  { header: "Establecimiento", cell: (f) => f.materia?.aula ?? "—", className: "text-slate-600" },
  { header: "Indumentaria / Estatus detectado", cell: (f) => <Estatus {...f} /> },
];

const COLUMNA_MATERIA: Column<FilaHistorial> = {
  header: "Materia",
  cell: (f) => f.asistencia.materia_nombre ?? f.materia?.nombre ?? "—",
  className: "text-slate-800",
};

/** Historial de una materia: /app/materias/:materiaId/historial */
export const HistorialMateriaPage = () => {
  const { materiaId } = useParams();
  const { data, loading, error, reload } = useAsync(cargarHistorial, [], "No se pudo cargar tu historial");
  const materia = data?.materias.find((m) => m._id === materiaId);
  const filas = data?.filas.filter((f) => f.asistencia.materia_id === materiaId) ?? null;
  // Si ya no está matriculado, el nombre y el docente salen de sus asistencias.
  const nombre = materia?.nombre ?? filas?.[0]?.asistencia.materia_nombre ?? null;
  const docente = materia?.docente_nombre ?? filas?.[0]?.asistencia.docente_nombre ?? null;

  return (
    <>
      <Topbar
        title={
          nombre
            ? `${nombre}${materia?.codigo ? ` (${materia.codigo})` : ""} - Historial de Acceso`
            : "Historial de Acceso"
        }
      />

      <div className="space-y-6 p-8">
        <BackLink to="/app/materias">Volver a mis materias</BackLink>

        <Card className="space-y-1">
          <Eyebrow>Historial individual</Eyebrow>
          {loading ? (
            <Skeleton className="h-7 w-72" />
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-800">
                {nombre ? `${nombre}${materia?.seccion ? ` - Sección ${materia.seccion}` : ""}` : "Materia no encontrada"}
              </h2>
              {nombre && <p className="text-sm text-slate-500">Docente: {docente ?? "Por asignar"}</p>}
            </>
          )}
        </Card>

        <DataTable
          columns={COLUMNAS}
          rows={filas}
          rowKey={(f) => f.asistencia._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={
            data && !nombre
              ? "No estás inscrito en esta materia."
              : "Aún no tienes accesos registrados en esta materia."
          }
        />
      </div>
    </>
  );
};

/** Todos los accesos del alumno: /app/historial */
export const HistorialGeneralPage = () => {
  const { data, loading, error, reload } = useAsync(cargarHistorial, [], "No se pudo cargar tu historial");

  return (
    <>
      <Topbar title="Historial de Acceso" />

      <div className="space-y-6 p-8">
        <Card className="space-y-1">
          <Eyebrow>Historial individual</Eyebrow>
          <h2 className="text-xl font-bold text-slate-800">Todos tus accesos del ciclo</h2>
          <p className="text-sm text-slate-500">
            Cada ingreso a laboratorios, clínicas y talleres validado por el sistema InduDetect.
          </p>
        </Card>

        <DataTable
          columns={[COLUMNAS[0], COLUMNAS[1], COLUMNA_MATERIA, COLUMNAS[2], COLUMNAS[3]]}
          rows={data?.filas ?? null}
          rowKey={(f) => f.asistencia._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty="Aún no tienes accesos registrados."
        />
      </div>
    </>
  );
};

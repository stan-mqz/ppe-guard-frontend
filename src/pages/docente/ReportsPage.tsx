import { useLoaderData, useRouteError, useSearchParams, type LoaderFunctionArgs } from "react-router-dom";
import { requireAuth } from "@/auth/guards";
import { getApiErrorMessage } from "@/api/client";
import { listarMaterias, listarMateriasDocente } from "@/api/materias";
import { listarAsistencias, obtenerReportePractica } from "@/api/asistencias";
import { Header } from "@/components/Header";
import type { ISODateTime, MateriaInDB } from "@/types";

interface FilaHistorial {
  practicaId: string;
  materiaId: string;
  materiaNombre: string;
  aula: string;
  horaInicio: ISODateTime;
  presentes: number;
  totalMatriculados: number;
}

interface ReportsLoaderData {
  materias: MateriaInDB[];
  filas: FilaHistorial[];
}

/**
 * La API no tiene un "GET /practicas" para listar el historial, así que se
 * reconstruye así:
 *   1. materias del usuario
 *   2. GET /asistencias?materia_id=... por cada materia -> practica_id -> materia
 *   3. GET /practicas/{id}/reporte por cada práctica -> fecha, presentes, total
 *
 * Limitación: una práctica sin ninguna asistencia registrada no aparece.
 * Cuando exista un endpoint de listado de prácticas, este loader se simplifica
 * a una sola llamada.
 */
export const reportsLoader = async (args: LoaderFunctionArgs) => {
  const { session } = requireAuth("docente", "coordinador")(args);

  const materias =
    session.payload.rol === "docente"
      ? await listarMateriasDocente(session.payload.uid)
      : await listarMaterias();

  const asistenciasPorMateria = await Promise.all(
    materias.map(async (materia) => ({
      materia,
      asistencias: await listarAsistencias({ materia_id: materia._id }),
    })),
  );

  const materiaPorPractica = new Map<string, MateriaInDB>();
  for (const { materia, asistencias } of asistenciasPorMateria) {
    for (const a of asistencias) materiaPorPractica.set(a.practica_id, materia);
  }

  const practicaIds = [...materiaPorPractica.keys()];
  // allSettled: si falla el reporte de una práctica, el resto del historial igual se muestra
  const reportes = await Promise.allSettled(practicaIds.map((id) => obtenerReportePractica(id)));

  const filas: FilaHistorial[] = reportes.flatMap((resultado, i) => {
    if (resultado.status !== "fulfilled") return [];
    const reporte = resultado.value;
    const materia = materiaPorPractica.get(practicaIds[i])!;
    return [
      {
        practicaId: reporte.practica_id,
        materiaId: materia._id,
        materiaNombre: reporte.materia_nombre,
        aula: materia.aula,
        horaInicio: reporte.hora_inicio,
        presentes: reporte.presentes,
        totalMatriculados: reporte.total_matriculados,
      },
    ];
  });

  filas.sort((a, b) => new Date(b.horaInicio).getTime() - new Date(a.horaInicio).getTime());

  return { materias, filas } satisfies ReportsLoaderData;
};

export const ReportsErrorBoundary = () => {
  const error = useRouteError();
  return (
    <>
      <Header title="Estadísticas e Historial de Prácticas" />
      <p className="p-8 font-medium text-red-600">
        {getApiErrorMessage(error, "No se pudo cargar el historial de prácticas")}
      </p>
    </>
  );
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-11-18T08:00:00" -> "18 Nov 2026 • 08:00" */
function formatearFechaHora(iso: ISODateTime): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm}`;
}

const COLUMNAS = "grid grid-cols-[minmax(170px,1fr)_minmax(160px,1.4fr)_minmax(130px,1fr)_minmax(130px,1.4fr)] gap-4";

export const ReportsPage = () => {
  const { materias, filas } = useLoaderData() as ReportsLoaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const materiaSeleccionada = searchParams.get("materia");

  const filasVisibles = materiaSeleccionada
    ? filas.filter((f) => f.materiaId === materiaSeleccionada)
    : filas;

  const seleccionar = (materiaId: string | null) =>
    setSearchParams(materiaId ? { materia: materiaId } : {});

  const tabClass = (activo: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      activo
        ? "bg-brand text-white shadow-sm"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <>
      <Header title="Estadísticas e Historial de Prácticas" />

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tabClass(materiaSeleccionada === null)}
            onClick={() => seleccionar(null)}
          >
            Todas mis materias
          </button>
          {materias.map((m) => (
            <button
              key={m._id}
              type="button"
              className={tabClass(materiaSeleccionada === m._id)}
              onClick={() => seleccionar(m._id)}
            >
              {m.nombre}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Registro histórico de prácticas</h2>

          {filasVisibles.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              {materiaSeleccionada
                ? "Esta materia aún no tiene prácticas registradas. Inicie una práctica desde Mis Clases."
                : "Aún no hay prácticas registradas. Inicie una práctica desde Mis Clases."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className={`${COLUMNAS} px-4 pb-3 text-xs font-semibold uppercase text-slate-500`}>
                  <span>Fecha / hora</span>
                  <span>Materia</span>
                  <span>Establecimiento</span>
                  <span>Asistencia total</span>
                </div>

                <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {filasVisibles.map((f) => (
                    <li key={f.practicaId} className={`${COLUMNAS} items-center px-4 py-3 text-sm`}>
                      <span className="font-semibold text-slate-900">{formatearFechaHora(f.horaInicio)}</span>
                      <span className="text-slate-800">{f.materiaNombre}</span>
                      <span className="text-xs text-slate-500">{f.aula}</span>
                      <span className="text-xs text-slate-700">
                        {f.presentes} de {f.totalMatriculados} Alumnos
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
};
import clsx from "clsx";
import { Info } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listarMateriasDetalle } from "@/api/materiasDetalle";
import { listarPracticasMateria, obtenerReporte } from "@/api/practicas";
import { listarUsuarios } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { Card, Skeleton } from "@/components/Card";
import { DataTable, type Column } from "@/components/DataTable";
import { Field, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { FilaAsistencia } from "@/types";
import type { MateriaVista } from "@/types/portal";
import { formatFechaHora } from "@/utils/format";

const Dato = ({ label, children, tone }: { label: string; children: string; tone?: "alerta" }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className={clsx("mt-1 font-bold", tone === "alerta" ? "text-amber-600" : "text-slate-800")}>{children}</p>
  </div>
);

/** Columnas de la sesión: fijas + una por cada EPP que exige la materia. */
function columnasSesion(epp: string[]): Column<FilaAsistencia>[] {
  return [
    { header: "Carnet", cell: (f) => f.codigo, className: "text-slate-500" },
    { header: "Alumno", cell: (f) => <span className="font-semibold text-slate-800">{f.nombre}</span> },
    {
      header: "Biometría",
      cell: (f) =>
        f.presente ? (
          <span className="font-semibold text-emerald-600">✓ Validado</span>
        ) : (
          <span className="text-slate-400">Ausente</span>
        ),
    },
    ...epp.map(
      (prenda): Column<FilaAsistencia> => ({
        header: prenda,
        cell: (f) =>
          !f.presente ? (
            <span className="text-slate-400">—</span>
          ) : f.faltantes.includes(prenda) ? (
            <span className="font-semibold text-red-500">Faltante</span>
          ) : (
            <span className="text-slate-600">Detectada</span>
          ),
      }),
    ),
    {
      header: "Estado EPP",
      align: "right",
      cell: (f) =>
        !f.presente ? (
          <span className="text-xs font-bold uppercase text-slate-400">Sin registro</span>
        ) : (
          <span
            className={clsx(
              "inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase",
              f.cumplio_indumentaria ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
            )}
          >
            {f.cumplio_indumentaria ? "Completo" : "No reglamentario"}
          </span>
        ),
    },
  ];
}

/** Última sesión registrada de una materia. */
function SesionMateria({ materia, docente }: { materia: MateriaVista; docente: string }) {
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [ultima] = await listarPracticasMateria(materia._id);
      return ultima ? { practica: ultima, reporte: await obtenerReporte(ultima._id) } : null;
    },
    [materia._id],
    "No se pudo cargar la última sesión de la materia",
  );
  const reporte = data?.reporte;

  return (
    <section className="space-y-4">
      <Card className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Dato label="Docente">{docente}</Dato>
        <Dato label="Materia activa">{`${materia.codigo ? `${materia.codigo} • ` : ""}${materia.nombre}`}</Dato>
        {loading ? (
          <>
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </>
        ) : (
          <>
            <Dato label="Alertas / incidencias" tone={reporte?.no_cumplieron ? "alerta" : undefined}>
              {reporte ? `${reporte.no_cumplieron} Incidencia${reporte.no_cumplieron === 1 ? "" : "s"}` : "—"}
            </Dato>
            <Dato label="Asistencia general">
              {reporte ? `${reporte.presentes} / ${reporte.total_matriculados} Alumnos` : "—"}
            </Dato>
          </>
        )}
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Alumnos Registrados en la Sesión</h2>
          {data && (
            <p className="text-sm text-slate-500">
              Última sesión: {formatFechaHora(data.practica.hora_inicio)}
              {data.practica.tema && ` • ${data.practica.tema}`}
            </p>
          )}
        </div>
        <Link to={`/app/reportes/${materia._id}`} className="text-sm font-semibold text-brand hover:underline">
          Ver historial completo de prácticas
        </Link>
      </div>

      <DataTable
        columns={columnasSesion(materia.epp)}
        rows={reporte?.detalle ?? null}
        rowKey={(f) => f.alumno_id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty="Esta materia aún no tiene sesiones de práctica registradas."
      />
    </section>
  );
}

const COLUMNAS_MATERIAS = (onVer: (id: string) => void): Column<MateriaVista>[] => [
  { header: "Código", cell: (m) => <span className="font-semibold text-accent">{m.codigo ?? "—"}</span> },
  { header: "Nombre", cell: (m) => <span className="font-semibold text-slate-800">{m.nombre}</span> },
  { header: "Sección", cell: (m) => m.seccion ?? "—", className: "text-slate-600" },
  { header: "Complejo / Lab", cell: (m) => m.aula, className: "text-slate-600" },
  {
    header: "Acción",
    align: "right",
    cell: (m) => (
      <button type="button" onClick={() => onVer(m._id)} className="font-semibold text-brand hover:underline">
        Ver Detalle
      </button>
    ),
  },
];

export const CentroReportesPage = () => {
  // La selección vive en la URL para que "volver" desde el detalle la conserve.
  const [params, setParams] = useSearchParams();
  const docenteId = params.get("docente") ?? "";
  const materiaId = params.get("materia") ?? "";

  const docentes = useAsync(() => listarUsuarios("docente"), [], "No se pudo cargar la lista de docentes");
  const materias = useAsync(
    () => (docenteId ? listarMateriasDetalle({ docente_id: docenteId }) : Promise.resolve([])),
    [docenteId],
    "No se pudieron cargar las materias del docente",
  );

  const docente = docentes.data?.find((d) => d._id === docenteId);
  const materia = materias.data?.find((m) => m._id === materiaId);
  const seleccionar = (docenteNuevo: string, materiaNueva = "") =>
    setParams(
      { ...(docenteNuevo && { docente: docenteNuevo }), ...(materiaNueva && { materia: materiaNueva }) },
      { replace: true },
    );

  return (
    <>
      <Topbar title="Centro de Reportes y Cumplimiento EPP" />

      <div className="space-y-6 p-8">
        <Card className="space-y-4">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Filtrar registros de asistencia</h2>

          {docentes.error ? (
            <ErrorState message={docentes.error} onRetry={docentes.reload} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="1. SELECCIONAR DOCENTE">
                <Select value={docenteId} onChange={(e) => seleccionar(e.target.value)} disabled={docentes.loading}>
                  <option value="">{docentes.loading ? "Cargando docentes..." : "Seleccione un docente"}</option>
                  {docentes.data?.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.nombre} ({d.codigo})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="2. SELECCIONAR MATERIA (DEPENDIENTE)">
                <Select
                  value={materia ? materiaId : ""}
                  onChange={(e) => seleccionar(docenteId, e.target.value)}
                  disabled={!docenteId || materias.loading}
                >
                  <option value="">
                    {!docenteId
                      ? "Primero seleccione un docente"
                      : materias.loading
                        ? "Cargando materias..."
                        : "Todas las materias del docente"}
                  </option>
                  {docenteId &&
                    materias.data?.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.codigo ? `${m.codigo} • ` : ""}
                        {m.nombre}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            Los usuarios con rol de Docente ingresan directamente a la lista de sus materias asignadas sin
            pasar por este selector general de coordinación.
          </p>
        </Card>

        {!docenteId ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Seleccione un docente para consultar sus materias y registros de asistencia.
          </p>
        ) : materia ? (
          <SesionMateria key={materia._id} materia={materia} docente={docente?.nombre ?? materia.docente_nombre ?? "—"} />
        ) : (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800">Materias Asignadas al Docente Seleccionado</h2>
            <DataTable
              columns={COLUMNAS_MATERIAS((id) => seleccionar(docenteId, id))}
              rows={materias.data}
              rowKey={(m) => m._id}
              loading={materias.loading}
              error={materias.error}
              onRetry={materias.reload}
              empty="Este docente no tiene materias asignadas."
            />
          </section>
        )}
      </div>
    </>
  );
};

import clsx from "clsx";
import { ShieldAlert, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useParams } from "react-router-dom";
import { urlEvidencia } from "@/api/config";
import { obtenerMateria } from "@/api/materiasDetalle";
import { obtenerPractica, obtenerReporte } from "@/api/practicas";
import { ErrorState } from "@/components/AsyncState";
import { BackLink } from "@/components/BackLink";
import { Card, Eyebrow, Skeleton } from "@/components/Card";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { FilaAsistencia } from "@/types";
import type { MateriaVista, PracticaDetalle } from "@/types/portal";
import { formatFechaHora, formatHora } from "@/utils/format";
import { etiquetaEpp, etiquetaSeccion } from "@/utils/materia";

const Badge = ({ ok, children }: { ok: boolean; children: string }) => (
  <span
    className={clsx(
      "inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase",
      ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
    )}
  >
    {children}
  </span>
);

const AUSENTE = <span className="text-slate-400">—</span>;

/** Columnas de la tabla: fijas + una por cada EPP que exige la materia. */
function columnasDesglose(epp: string[]): Column<FilaAsistencia>[] {
  return [
    { header: "Carnet", cell: (f) => f.codigo, className: "text-slate-500" },
    { header: "Alumno", cell: (f) => <span className="font-semibold text-slate-800">{f.nombre}</span> },
    {
      header: "Hora entrada",
      cell: (f) => (f.hora_identificacion ? formatHora(f.hora_identificacion) : "Ausente"),
      className: "text-slate-500",
    },
    ...epp.map(
      (prenda): Column<FilaAsistencia> => ({
        header: etiquetaEpp(prenda),
        align: "center",
        cell: (f) =>
          !f.presente ? AUSENTE : f.faltantes.includes(prenda) ? (
            <Badge ok={false}>Faltante</Badge>
          ) : (
            <Badge ok>Correcto</Badge>
          ),
      }),
    ),
    {
      header: "Estado final",
      align: "right",
      cell: (f) =>
        !f.presente ? (
          <span className="text-xs font-bold uppercase text-slate-400">Ausente</span>
        ) : (
          <span className="inline-flex items-center gap-3">
            {f.evidencia_url && (
              <a
                href={urlEvidencia(f.evidencia_url)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Ver evidencia
              </a>
            )}
            <Badge ok={f.cumplio_indumentaria === true}>
              {f.cumplio_indumentaria ? "Completo" : "Incompleto"}
            </Badge>
          </span>
        ),
    },
  ];
}

/** Detalle de una práctica: /app/reportes/:materiaId/practicas/:practicaId */
export const DetallePracticaPage = () => {
  const { materiaId, practicaId } = useParams();
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [materia, reporte, practica] = await Promise.all([
        // Sin la materia (p. ej. fuera del alcance del usuario) el reporte se
        // muestra igual, solo que sin las columnas por prenda.
        obtenerMateria(materiaId!).catch(() => null as MateriaVista | null),
        obtenerReporte(practicaId!),
        // El número y el tema son un extra: sin ellos el reporte igual se muestra.
        obtenerPractica(practicaId!).catch(() => null as PracticaDetalle | null),
      ]);
      return { materia, reporte, practica };
    },
    [materiaId, practicaId],
    "No se pudo cargar el reporte de la práctica",
  );

  const reporte = data?.reporte;
  const practica = data?.practica;

  return (
    <>
      <Topbar title="Detalle de Práctica y Verificación EPP" />

      <div className="space-y-6 p-8">
        {data?.materia !== null && (
          <BackLink to={`/app/reportes/${materiaId}`}>Volver al historial de la materia</BackLink>
        )}

        {error ? (
          <Card>
            <ErrorState message={error} onRetry={reload} />
          </Card>
        ) : (
          <>
            <Card className="space-y-1">
              {loading ? (
                <>
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="mt-2 h-7 w-96" />
                </>
              ) : (
                <>
                  <Eyebrow>
                    {data!.materia
                      ? `${etiquetaSeccion(data!.materia)} • ${data!.materia.aula}`
                      : reporte!.materia_nombre}
                  </Eyebrow>
                  <h2 className="text-xl font-bold text-slate-800">
                    {practica?.numero ? `Práctica #${practica.numero}: ` : ""}
                    {practica?.tema ?? reporte!.materia_nombre}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Docente: {reporte!.docente_nombre} | {formatFechaHora(reporte!.hora_inicio)}
                  </p>
                </>
              )}
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={UserCheck} label="Presentes" value={reporte?.presentes ?? null} />
              <StatCard icon={UserX} label="Ausentes" value={reporte?.ausentes ?? null} tone="neutral" />
              <StatCard icon={ShieldCheck} label="Indumentaria correcta" value={reporte?.cumplieron ?? null} tone="success" />
              <StatCard icon={ShieldAlert} label="Indumentaria incorrecta" value={reporte?.no_cumplieron ?? null} tone="danger" />
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-800">
                Desglose Individual de Alumnos y Verificación EPP
              </h2>
              <DataTable
                columns={columnasDesglose(data?.materia?.epp ?? [])}
                rows={reporte?.detalle ?? null}
                rowKey={(f) => f.alumno_id}
                loading={loading}
                empty="Esta práctica no tiene alumnos matriculados."
              />
            </section>
          </>
        )}
      </div>
    </>
  );
};

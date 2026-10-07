import { Link, useParams } from "react-router-dom";
import { obtenerMateria } from "@/api/materiasDetalle";
import { listarPracticasMateria } from "@/api/practicas";
import { BackLink } from "@/components/BackLink";
import { Card, Skeleton } from "@/components/Card";
import { DataTable, type Column } from "@/components/DataTable";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import type { PracticaDetalle } from "@/types/portal";
import { formatFechaHora } from "@/utils/format";

/** Historial de prácticas de una materia: /app/reportes/:materiaId (docente y coordinación). */
export const ReporteMateriaPage = () => {
  const { materiaId } = useParams();
  const esDocente = useSession().payload.rol === "docente";
  const materia = useAsync(() => obtenerMateria(materiaId!), [materiaId], "No se pudo cargar la materia");
  const practicas = useAsync(
    () => listarPracticasMateria(materiaId!),
    [materiaId],
    "No se pudo cargar el historial de prácticas",
  );

  const columnas: Column<PracticaDetalle>[] = [
    {
      header: "Fecha / hora",
      cell: (p) => <span className="font-semibold text-slate-800">{formatFechaHora(p.hora_inicio)}</span>,
    },
    {
      header: "Práctica / tema",
      cell: (p) => (
        <>
          {p.numero ? `Práctica #${p.numero}` : "Práctica de laboratorio"}
          {p.tema && <span className="text-slate-500">: {p.tema}</span>}
          {p.estado === "activa" && <span className="ml-2 text-xs font-semibold text-emerald-600">• En curso</span>}
        </>
      ),
    },
    { header: "Presentes", cell: (p) => p.presentes ?? "—", className: "font-semibold text-emerald-600" },
    { header: "Ausentes", cell: (p) => p.ausentes ?? "—", className: "text-slate-500" },
    {
      header: "Acción",
      align: "right",
      cell: (p) => (
        <Link
          to={`/app/reportes/${materiaId}/practicas/${p._id}`}
          className="font-semibold text-brand hover:underline"
        >
          Ver Detalle
        </Link>
      ),
    },
  ];

  return (
    <>
      <Topbar title="Reporte Detallado de Materia" />

      <div className="space-y-6 p-8">
        <BackLink to={esDocente ? "/app/reportes" : "/app/centro-reportes"}>
          {esDocente ? "Volver a reportes" : "Volver al centro de reportes"}
        </BackLink>

        <Card className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-slate-500">Materia seleccionada</p>
            {materia.loading ? (
              <Skeleton className="h-7 w-64" />
            ) : materia.error ? (
              <p className="text-sm font-medium text-red-600">{materia.error}</p>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-800">
                  {materia.data!.nombre}
                  {materia.data!.codigo && <span className="text-accent"> ({materia.data!.codigo})</span>}
                </h2>
                <p className="text-sm text-slate-500">
                  {materia.data!.aula}
                  {materia.data!.docente_nombre && ` | Docente: ${materia.data!.docente_nombre}`}
                </p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-slate-500">Sección</p>
            <p className="text-2xl font-bold text-brand">{materia.data?.seccion ?? "—"}</p>
          </div>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Historial de Prácticas Ejecutadas</h2>
          <DataTable
            columns={columnas}
            rows={practicas.data}
            rowKey={(p) => p._id}
            loading={practicas.loading}
            error={practicas.error}
            onRetry={practicas.reload}
            empty="Esta materia aún no tiene prácticas registradas."
          />
        </section>
      </div>
    </>
  );
};

import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { importarAlumnos, obtenerResumenCoordinacion } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";

interface MetricaProps {
  label: string;
  value?: number;
  badge?: string;
  detalle?: string | null;
}

const Metrica = ({ label, value, badge, detalle }: MetricaProps) => (
  <Card className="space-y-2">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    {value === undefined ? (
      <Skeleton className="h-10 w-20" />
    ) : (
      <p className="flex items-center gap-3 text-4xl font-bold text-brand">
        {value}
        {badge && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            {badge}
          </span>
        )}
      </p>
    )}
    <p className="min-h-5 text-sm text-slate-500">{detalle}</p>
  </Card>
);

export const PanelPage = () => {
  const { data, error, reload } = useAsync(obtenerResumenCoordinacion, [], "No se pudieron cargar las métricas");
  const { toast, setToast, cerrar } = useToast();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [errorImportar, setErrorImportar] = useState<string | null>(null);

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setImportando(true);
    setErrorImportar(null);
    try {
      const { importados, omitidos } = await importarAlumnos(archivo);
      setToast(
        `${importados} alumno${importados === 1 ? "" : "s"} importado${importados === 1 ? "" : "s"}` +
          (omitidos > 0 ? ` (${omitidos} fila${omitidos === 1 ? "" : "s"} omitida${omitidos === 1 ? "" : "s"} por código repetido o datos incompletos).` : "."),
      );
      reload();
    } catch (err) {
      setErrorImportar(getApiErrorMessage(err, "No se pudo importar el archivo."));
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      <Topbar title="Panel de Control General - Coordinación" />

      <div className="space-y-6 p-8">
        <section className="rounded-xl bg-brand p-6 text-white">
          <h2 className="text-xl font-bold">Bienvenido al Portal de Coordinación UNIVO</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            Supervise el cumplimiento del equipo de protección personal (EPP) en laboratorios, clínicas y
            talleres, y administre el control biométrico de materias, docentes y alumnos.
          </p>
        </section>

        {error ? (
          <Card>
            <ErrorState message={error} onRetry={reload} />
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Metrica
              label="Materias supervisadas"
              value={data?.materias}
              badge={data && data.materias_nuevas > 0 ? `+${data.materias_nuevas}` : undefined}
              detalle={data && `${data.materias_lab_activo} con laboratorio activo`}
            />
            <Metrica
              label="Docentes asignados"
              value={data?.docentes}
              detalle={data && `${data.docentes_activos_hoy} activos hoy`}
            />
            <Metrica label="Alumnos evaluados" value={data?.alumnos} />
          </div>
        )}

        <Card className="mx-auto max-w-md space-y-3">
          <h2 className="text-center text-lg font-bold text-slate-800">Acciones Rápidas</h2>
          <Link to="/app/gestion-materias/nueva" className={buttonClass("primary", "w-full")}>
            Crear Nueva Materia
          </Link>
          <Link to="/app/docentes/nuevo" className={buttonClass("outline", "w-full")}>
            Dar de Alta Docente
          </Link>
          <Button variant="secondary" className="w-full" disabled={importando} onClick={() => archivoRef.current?.click()}>
            {importando ? "Importando..." : "Importar Lista de Alumnos"}
          </Button>
          <input ref={archivoRef} type="file" accept=".csv,text/csv" hidden onChange={importar} />
          <p className="text-center text-xs text-slate-400">
            CSV con columnas: código, nombre, carrera, facultad.
          </p>
          {errorImportar && <p className="text-center text-sm font-medium text-red-600">{errorImportar}</p>}
        </Card>
      </div>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

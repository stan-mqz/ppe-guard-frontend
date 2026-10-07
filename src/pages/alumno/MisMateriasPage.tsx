import { MapPin, User } from "lucide-react";
import { Link } from "react-router-dom";
import { listarMateriasDetalle } from "@/api/materiasDetalle";
import { ErrorState } from "@/components/AsyncState";
import { buttonClass } from "@/components/Button";
import { Card, Eyebrow, Skeleton } from "@/components/Card";
import { EppTags } from "@/components/EppTag";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import type { MateriaVista } from "@/types/portal";
import { etiquetaSeccion } from "@/utils/materia";

const MateriaCard = ({ materia }: { materia: MateriaVista }) => (
  <Card className="flex flex-col gap-4">
    <div className="space-y-1 border-b border-slate-200 pb-4">
      <Eyebrow>{etiquetaSeccion(materia)}</Eyebrow>
      <h3 className="text-xl font-bold text-slate-800">{materia.nombre}</h3>
    </div>

    <div className="space-y-2 text-sm text-slate-600">
      <p className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        {materia.aula}
      </p>
      <p className="flex items-center gap-2">
        <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        {materia.docente_nombre ?? "Docente por asignar"}
      </p>
    </div>

    <div className="flex-1 space-y-2">
      <p className="text-xs font-semibold text-slate-600">Requisitos de Ingreso:</p>
      <EppTags epp={materia.epp} />
    </div>

    <Link to={`/app/materias/${materia._id}/historial`} className={buttonClass("secondary", "w-full")}>
      Ver Mi Historial
    </Link>
  </Card>
);

export const MisMateriasPage = () => {
  const session = useSession();
  const { data, loading, error, reload } = useAsync(
    () => listarMateriasDetalle({ alumno_id: session.payload.uid }),
    [session.payload.uid],
    "No se pudieron cargar tus materias",
  );
  const conEpp = data?.filter((m) => m.epp.length > 0).length;

  return (
    <>
      <Topbar title="Mis Materias" />

      <div className="space-y-8 p-8">
        <Card className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <Eyebrow>Materias inscritas</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido al Ciclo Activo, {session.nombre}</h2>
            <p className="text-sm text-slate-500">
              Aquí puedes verificar las materias en las que requieres cumplimiento de vestimenta
              reglamentaria y ver tus accesos autorizados.
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold leading-none text-brand">{conEpp ?? "—"}</p>
            <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Materias con EPP Requerido</p>
          </div>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tus Clases Programadas</h2>
            <p className="text-sm text-slate-500">
              Asiste portando la indumentaria reglamentaria para que el sistema de IA InduDetect valide tu
              acceso.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="space-y-4">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-11 w-full" />
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <ErrorState message={error} onRetry={reload} />
            </Card>
          ) : data!.length === 0 ? (
            <Card className="text-center text-sm text-slate-500">
              Aún no estás inscrito en ninguna materia con práctica de laboratorio.
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {data!.map((m) => (
                <MateriaCard key={m._id} materia={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

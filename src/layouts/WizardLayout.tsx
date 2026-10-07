import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, Outlet, useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { listarMateriasDetalle } from "@/api/materiasDetalle";
import { StatusPill } from "@/components/StatusPill";
import { Stepper } from "@/components/Stepper";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import type { MateriaVista } from "@/types/portal";

const PASOS = [
  { ruta: "datos", titulo: "Datos Generales", detalle: "Verificación de carnet" },
  { ruta: "instrucciones", titulo: "Instrucciones", detalle: "Preparación de captura" },
  { ruta: "captura", titulo: "Captura Biométrica", detalle: "Enrolamiento facial" },
];

export interface DatosEnrolamiento {
  nombre: string;
  codigo: string;
  password: string;
  materiasIds: string[];
}

export interface EnrolamientoContext {
  datos: DatosEnrolamiento | null;
  setDatos: (datos: DatosEnrolamiento) => void;
  materias: MateriaVista[] | null;
  materiasLoading: boolean;
  materiasError: string | null;
  recargarMaterias: () => void;
  /** Materia desde la que el docente abrió el asistente (?materia=). */
  materiaInicial: string | null;
  /** A dónde volver al cancelar o finalizar. */
  salida: string;
}

export const useEnrolamiento = () => useOutletContext<EnrolamientoContext>();

/**
 * Layout del enrolamiento biométrico (/app/alumnos/nuevo/*): el sidebar
 * muestra los 3 pasos en lugar del menú y guarda los datos entre pasos.
 */
export default function WizardLayout() {
  const session = useSession();
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const [datos, setDatos] = useState<DatosEnrolamiento | null>(null);

  const esDocente = session.payload.rol === "docente";
  const materiaInicial = searchParams.get("materia");
  const salida = !esDocente ? "/app/alumnos" : materiaInicial ? `/app/materias/${materiaInicial}` : "/app/clases";

  const materias = useAsync(
    () => listarMateriasDetalle(esDocente ? { docente_id: session.payload.uid } : undefined),
    [esDocente, session.payload.uid],
    "No se pudieron cargar las materias",
  );

  const actual = Math.max(0, PASOS.findIndex((p) => pathname.endsWith(`/${p.ruta}`)));
  // Los pasos 2 y 3 no se pueden abrir sin haber completado los datos.
  if (actual > 0 && !datos) return <Navigate to={`/app/alumnos/nuevo/datos${search}`} replace />;

  const context: EnrolamientoContext = {
    datos,
    setDatos,
    materias: materias.data,
    materiasLoading: materias.loading,
    materiasError: materias.error,
    recargarMaterias: materias.reload,
    materiaInicial,
    salida,
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-brand text-white">
        <div>
          <div className="px-6 py-6">
            <p className="text-lg font-bold leading-tight">PPE GUARD</p>
            <p className="text-xs font-semibold tracking-wide text-accent">UNIVERSIDAD DE ORIENTE</p>
          </div>

          <ol className="mt-4 space-y-5 px-6">
            {PASOS.map((paso, i) => (
              <li key={paso.ruta} className="flex items-center gap-3" aria-current={i === actual ? "step" : undefined}>
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    i < actual && "bg-emerald-500 text-white",
                    i === actual && "bg-accent text-brand-dark",
                    i > actual && "border border-white/30 text-white/60",
                  )}
                >
                  {i < actual ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span>
                  <span className={clsx("block text-sm font-semibold", i > actual && "text-white/60")}>
                    {paso.titulo}
                  </span>
                  <span className="block text-xs text-white/50">{paso.detalle}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mx-4 mt-8 rounded-lg border border-accent/70 p-3">
            <p className="text-xs font-bold uppercase text-accent">Registro único</p>
            <p className="mt-1 text-xs text-white/70">
              Este proceso biométrico se realiza una sola vez para toda la carrera estudiantil del alumno.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{session.nombre}</p>
          <p className="text-xs uppercase text-white/60">{session.payload.rol}</p>
          <Link
            to={salida}
            className="mt-3 block w-full rounded-md border border-white/20 px-3 py-1.5 text-center text-sm text-white/80 hover:bg-brand-light"
          >
            Salir del enrolamiento
          </Link>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50">
        <Topbar
          title={`Enrolamiento de Alumno - ${PASOS[actual].titulo}`}
          pill={<StatusPill>Sistema biométrico activo (IA)</StatusPill>}
          etiqueta={esDocente ? "Portal docente UNIVO" : "Portal coordinación UNIVO"}
        />
        <div className="mx-auto max-w-5xl space-y-6 p-8">
          <Stepper steps={PASOS.map((p) => p.titulo)} current={actual} />
          <Outlet context={context} />
        </div>
      </main>
    </div>
  );
}

import { useLoaderData, useRouteError, type LoaderFunctionArgs } from "react-router-dom";
import { requireAuth } from "@/auth/guards";
import type { Session } from "@/auth/session";
import { getApiErrorMessage } from "@/api/client";
import { listarMateriasDocente } from "@/api/materias";
import { listarPracticas } from "@/api/practices";
import { Header } from "@/components/Header";
import { SubjectCard } from "@/components/SubjectCard";
import type { MateriaInDB, PracticeInDB } from "@/types";

interface ClasesLoaderData {
  session: Session;
  materias: MateriaInDB[];
  practicas: PracticeInDB[];
}

export const clasesLoader = async (args: LoaderFunctionArgs) => {
  // Lanza redirect si no hay sesión o el rol no es docente
  const { session } = requireAuth("docente")(args);

  const [materias, practicas] = await Promise.all([
    listarMateriasDocente(session.payload.uid),
    // El catálogo de EPP es secundario: si falla, la página igual carga
    listarPracticas().catch(() => [] as PracticeInDB[]),
  ]);

  return { session, materias, practicas } satisfies ClasesLoaderData;
};

export const ClasesErrorBoundary = () => {
  const error = useRouteError();
  return (
    <>
      <Header title="Panel de Control Docente" />
      <p className="p-8 font-medium text-red-600">
        {getApiErrorMessage(error, "No se pudieron cargar las materias")}
      </p>
    </>
  );
};

export const ClasesPage = () => {
  const { session, materias, practicas } = useLoaderData() as ClasesLoaderData;

  return (
    <>
      <Header title="Panel de Control Docente" />

      <div className="w-[90%] mx-auto space-y-9 m-5 px-3">
        <div className="bg-brand p-3 rounded-md space-y-4">
          <h2 className="text-white font-bold">Estimado/a {session.nombre}</h2>
          <p className="text-gray-400">
            Bienvenido/a al ciclo activo II-2026. Gestione la indumentaria
            reglamentaria (EEP) de sus clases y verifique el cumplimiento
            biométrico en tiempo real
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg">Sus materias asignadas</h3>
          <p>
            Inicie prácticas de laboratorio para activar la cámara IA o gestione
            alumnos inscritos
          </p>
        </div>

        {materias.length === 0 ? (
          <p className="text-slate-500">No tiene materias asignadas.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {materias.map((m) => (
              <SubjectCard
                key={m._id}
                materia={m}
                ppe={practicas.find((p) => p.area === m.area)?.ppe_requerido ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
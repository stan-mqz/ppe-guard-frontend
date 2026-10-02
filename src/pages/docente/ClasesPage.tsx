import { Session } from "@/auth/session";
import { Header } from "@/components/Header";
import { useLoaderData } from "react-router-dom";

export const ClasesPage = () => {
  const { session } = useLoaderData() as { session: Session };

  console.log(session.payload);

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
      </div>
    </>
  );
};

import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import { requireAuth } from "@/auth/guards";
import { Header } from "@/components/Header";

interface PerfilDocente {
  nombre: string;
  codigo: string;
  correo: string | null;
  departamento: string | null;
}


export const perfilDocenteLoader = (args: LoaderFunctionArgs) => {
  const { session } = requireAuth("docente")(args);

  const perfil: PerfilDocente = {
    nombre: session.nombre,
    codigo: session.payload.sub,
    correo: null,
    departamento: null,
  };

  return { perfil };
};

const Campo = ({ label, valor }: { label: string; valor: string | null }) => (
  <div className="space-y-1.5">
    <dt className="text-[11px] font-semibold uppercase text-slate-500">{label}</dt>
    <dd
      className={`rounded-md bg-slate-100 px-3 py-2.5 text-sm ${
        valor ? "text-slate-800" : "italic text-slate-400"
      }`}
    >
      {valor ?? "No registrado"}
    </dd>
  </div>
);

export const PerfilDocentePage = () => {
  const { perfil } = useLoaderData() as { perfil: PerfilDocente };

  return (
    <>
      <Header title="Mi Perfil Institucional" />

      <div className="p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">Información Académica del Docente</h2>

          <dl className="space-y-4">
            <Campo label="Nombres completos" valor={perfil.nombre} />
            <Campo label="Código docente" valor={perfil.codigo} />
            <Campo label="Correo institucional" valor={perfil.correo} />
            <Campo label="Departamento académico" valor={perfil.departamento} />
          </dl>
        </section>
      </div>
    </>
  );
};
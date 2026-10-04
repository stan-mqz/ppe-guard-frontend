import type { MateriaInDB } from "@/types";
import { Link } from "react-router-dom";

interface SubjectCardProps {
  materia: MateriaInDB;
  ppe: string[];
}

export const SubjectCard = ({ materia, ppe }: SubjectCardProps) => {
  const detalleUrl = `/app/materias/${materia._id}`;

  return (
    <div className="w-[330px] space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
      <Link
        to={detalleUrl}
        className="block space-y-1 border-b border-slate-200 pb-3"
      >
        <h2 className="text-xs font-semibold text-yellow-600">{materia.carrera}</h2>
        <h2 className="text-xl font-bold text-slate-800">{materia.nombre}</h2>
      </Link>

      <div className="space-y-2 text-sm text-slate-600">
        <p>{materia.aula}</p>
        <p>{materia.alumnos_ids.length} Alumnos Inscritos</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase text-slate-600">
          EPP reglamentario:
        </p>
        <div className="flex flex-wrap gap-2">
          {ppe.length === 0 ? (
            <span className="text-xs text-slate-400">Sin EPP definido</span>
          ) : (
            ppe.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-900"></span>
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800">
          Iniciar Práctica IA
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={detalleUrl}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Alumnos
          </Link>
          <button className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Reportes
          </button>
        </div>
      </div>
    </div>
  );
};
export const SubjectCard = () => {
  return (
    <div className="w-[330px] space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="space-y-1 border-b border-slate-200 pb-3">
        <h2 className="text-xs font-semibold text-yellow-600">
          QO101 • Sección A
        </h2>
        <h2 className="text-xl font-bold text-slate-800">Química Orgánica I</h2>
      </div>

    
      <div className="space-y-2 text-sm text-slate-600">
        <p>Laboratorio B-2</p>
        <p>28 Alumnos Inscritos</p>
      </div>

     
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase text-slate-600">
          EPP reglamentario:
        </p>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-900"></span>
            Bata de Lab
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-900"></span>
            Gafas Prot.
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800">
          Iniciar Práctica IA
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Alumnos
          </button>
          <button className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Reportes
          </button>
        </div>
      </div>
    </div>
  );
};
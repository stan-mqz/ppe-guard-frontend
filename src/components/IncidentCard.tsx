import clsx from "clsx";

interface IncidentCardProps {
  tipo: "falta" | "ok";
  nombre: string;
  descripcion: string;
  hora: string;
}

export const IncidentCard = ({ tipo, nombre, descripcion, hora }: IncidentCardProps) => (
  <div
    className={clsx(
      "flex items-center gap-3 rounded-xl border px-4 py-3",
      tipo === "falta" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50",
    )}
  >
    <span className={clsx("h-2 w-2 shrink-0 rounded-full", tipo === "falta" ? "bg-red-500" : "bg-emerald-500")} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-slate-800">{nombre}</p>
      <p className={clsx("truncate text-xs", tipo === "falta" ? "text-red-600" : "text-emerald-700")}>
        {descripcion}
      </p>
    </div>
    <span className="shrink-0 text-xs text-slate-500">{hora}</span>
  </div>
);

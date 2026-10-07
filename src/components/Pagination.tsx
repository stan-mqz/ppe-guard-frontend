import clsx from "clsx";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Texto de conteo a la izquierda ("Mostrando 8 de 18 materias registradas"). */
  resumen: string;
}

/** Páginas a mostrar: primera, última y las vecinas de la actual. */
function paginas(page: number, total: number): (number | "…")[] {
  const visibles = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  return visibles.flatMap((p, i) => (i > 0 && p - visibles[i - 1] > 1 ? ["…" as const, p] : [p]));
}

export const Pagination = ({ page, totalPages, onChange, resumen }: PaginationProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
    <span className="text-slate-500">{resumen}</span>
    {totalPages > 1 && (
      <nav className="flex items-center gap-1" aria-label="Paginación">
        {paginas(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`sep-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onChange(p)}
              className={clsx(
                "h-8 min-w-8 rounded-md px-2 text-sm font-semibold",
                p === page
                  ? "bg-brand text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {p}
            </button>
          ),
        )}
      </nav>
    )}
  </div>
);

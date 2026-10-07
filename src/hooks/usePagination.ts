import { useEffect, useState } from "react";

/** Paginado en cliente (los listados del backend aún no soportan skip/limit). */
export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Si un filtro deja menos páginas, se vuelve a la última válida.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const actual = Math.min(page, totalPages);
  return {
    page: actual,
    totalPages,
    setPage,
    visibles: items.slice((actual - 1) * pageSize, actual * pageSize),
  };
}

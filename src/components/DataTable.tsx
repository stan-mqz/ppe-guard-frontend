import clsx from "clsx";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/AsyncState";
import { Skeleton } from "@/components/Card";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Mensaje cuando no hay filas. */
  empty: ReactNode;
  onRowClick?: (row: T) => void;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

// Las filas forman una tarjeta blanca; el encabezado queda sobre el fondo de la página.
const BODY =
  "[&>tr>td]:border-b [&>tr>td]:border-slate-200 [&>tr>td]:bg-white " +
  "[&>tr:first-child>td]:border-t [&>tr>td:first-child]:border-l [&>tr>td:last-child]:border-r " +
  "[&>tr:first-child>td:first-child]:rounded-tl-xl [&>tr:first-child>td:last-child]:rounded-tr-xl " +
  "[&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  let body: ReactNode;

  if (loading) {
    body = Array.from({ length: 5 }, (_, i) => (
      <tr key={i}>
        {columns.map((c) => (
          <td key={c.header} className="h-12 px-4">
            <Skeleton className="h-3 w-3/4" />
          </td>
        ))}
      </tr>
    ));
  } else if (error) {
    body = (
      <tr>
        <td colSpan={columns.length}>
          <ErrorState message={error} onRetry={onRetry} />
        </td>
      </tr>
    );
  } else if (!rows || rows.length === 0) {
    body = (
      <tr>
        <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
          {empty}
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr
        key={rowKey(row)}
        onClick={onRowClick && (() => onRowClick(row))}
        onKeyDown={onRowClick && ((e) => e.key === "Enter" && onRowClick(row))}
        tabIndex={onRowClick ? 0 : undefined}
        className={clsx(onRowClick && "cursor-pointer [&>td]:hover:bg-slate-50")}
      >
        {columns.map((c) => (
          <td key={c.header} className={clsx("h-12 px-4 py-2", ALIGN[c.align ?? "left"], c.className)}>
            {c.cell(row)}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm" aria-busy={loading}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                className={clsx(
                  "whitespace-nowrap px-4 pb-3 text-xs font-semibold uppercase text-slate-500",
                  ALIGN[c.align ?? "left"],
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={BODY}>{body}</tbody>
      </table>
    </div>
  );
}

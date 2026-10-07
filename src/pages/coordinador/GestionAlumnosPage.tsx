import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarUsuarios } from "@/api/usuariosGestion";
import { buttonClass } from "@/components/Button";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterChip } from "@/components/FilterChip";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/useToast";
import type { UsuarioDetalle } from "@/types/portal";
import { coincide, formatDiaMes } from "@/utils/format";
import { etiquetaEpp, listaEpp } from "@/utils/materia";

const UMBRAL_ASISTENCIA = 70;

const UltimaValidacion = ({ alumno }: { alumno: UsuarioDetalle }) => {
  const v = alumno.ultima_validacion;
  if (!v) return <span className="text-slate-400">Sin validaciones registradas</span>;
  const dia = formatDiaMes(v.fecha);
  return v.cumplio ? (
    <span className="text-slate-500">
      {dia} • {v.detectado.map(etiquetaEpp).join(" + ") || "EPP completo"} (Válido)
    </span>
  ) : (
    <span className="font-medium text-red-500">
      {dia} • No portaba {listaEpp(v.faltantes) || "el EPP reglamentario"}
    </span>
  );
};

const COLUMNAS: Column<UsuarioDetalle>[] = [
  { header: "Carnet", cell: (a) => a.codigo, className: "whitespace-nowrap text-slate-500" },
  { header: "Alumno", cell: (a) => <span className="font-semibold text-slate-800">{a.nombre}</span> },
  { header: "Carrera", cell: (a) => a.carrera ?? "—", className: "text-slate-600" },
  { header: "Última validación IA", cell: (a) => <UltimaValidacion alumno={a} /> },
];

export const GestionAlumnosPage = () => {
  const { data, loading, error, reload } = useAsync(
    () => listarUsuarios("alumno"),
    [],
    "No se pudo cargar la lista de alumnos",
  );
  const { toast, cerrar } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [soloBajaAsistencia, setSoloBajaAsistencia] = useState(false);

  const filtrados = useMemo(
    () =>
      (data ?? []).filter(
        (a) =>
          coincide(busqueda, a.nombre, a.codigo, a.carrera) &&
          (!soloBajaAsistencia ||
            (typeof a.asistencia_epp_pct === "number" && a.asistencia_epp_pct < UMBRAL_ASISTENCIA)),
      ),
    [data, busqueda, soloBajaAsistencia],
  );
  const { page, totalPages, setPage, visibles } = usePagination(filtrados);

  return (
    <>
      <Topbar title="Control de Alumnos Registrados" />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar alumno por nombre o carnet..." />
          <FilterChip active={soloBajaAsistencia} onClick={() => setSoloBajaAsistencia((v) => !v)}>
            Filtro: Menos del {UMBRAL_ASISTENCIA}% Asistencia EPP
          </FilterChip>
          <Link to="/app/alumnos/nuevo/datos" className={buttonClass("primary", "ml-auto")}>
            + Registrar Alumno
          </Link>
        </div>

        <DataTable
          columns={COLUMNAS}
          rows={visibles}
          rowKey={(a) => a._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length ? "Ningún alumno coincide con los filtros." : "Aún no hay alumnos registrados."}
        />

        {data && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            resumen={`Mostrando ${visibles.length} de ${
              filtrados.length === data.length ? data.length : `${filtrados.length} (de ${data.length})`
            } alumnos matriculados`}
          />
        )}
      </div>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { cambiarEstadoUsuario, listarUsuarios } from "@/api/usuariosGestion";
import { buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type Column } from "@/components/DataTable";
import { Select } from "@/components/Field";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { StatusPill } from "@/components/StatusPill";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/useToast";
import type { UsuarioDetalle } from "@/types/portal";
import { coincide } from "@/utils/format";

const departamentoDe = (d: UsuarioDetalle) => d.departamento ?? d.facultad ?? "—";

export const GestionDocentesPage = () => {
  const { data, loading, error, reload } = useAsync(
    () => listarUsuarios("docente"),
    [],
    "No se pudo cargar el personal docente",
  );
  const { toast, setToast, cerrar } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [porDesactivar, setPorDesactivar] = useState<UsuarioDetalle | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const departamentos = useMemo(() => [...new Set(data?.map(departamentoDe))].sort(), [data]);
  const filtrados = useMemo(
    () =>
      (data ?? []).filter(
        (d) => (!departamento || departamentoDe(d) === departamento) && coincide(busqueda, d.nombre, d.codigo),
      ),
    [data, busqueda, departamento],
  );
  const { page, totalPages, setPage, visibles } = usePagination(filtrados);

  const cambiarEstado = async (docente: UsuarioDetalle, activo: boolean) => {
    setProcesando(true);
    setErrorEstado(null);
    try {
      await cambiarEstadoUsuario(docente._id, activo);
      setToast(`${docente.nombre} fue ${activo ? "reactivado" : "desactivado"}.`);
      setPorDesactivar(null);
      reload();
    } catch (e) {
      // Al desactivar se muestra en el diálogo; al reactivar, sobre la tabla.
      setErrorEstado(getApiErrorMessage(e, "No se pudo cambiar el estado del docente."));
    } finally {
      setProcesando(false);
    }
  };

  const columnas: Column<UsuarioDetalle>[] = [
    { header: "Código", cell: (d) => d.codigo, className: "whitespace-nowrap text-slate-500" },
    { header: "Nombre completo", cell: (d) => <span className="font-semibold text-slate-800">{d.nombre}</span> },
    { header: "Departamento", cell: departamentoDe, className: "text-slate-600" },
    {
      header: "Materias asignadas",
      cell: (d) =>
        d.materias_asignadas?.length ? (
          <span title={d.materias_asignadas.join("\n")}>
            {d.materias_asignadas.map((m) => m.split(" • ")[0]).join(", ")}
          </span>
        ) : (
          <span className="text-slate-400">Sin asignar</span>
        ),
      className: "text-slate-600",
    },
    {
      header: "Estado",
      cell: (d) =>
        d.activo === false ? (
          <StatusPill tone="neutral" uppercase={false}>Inactivo</StatusPill>
        ) : (
          <StatusPill uppercase={false}>Activo</StatusPill>
        ),
    },
    {
      header: "Acciones",
      align: "right",
      cell: (d) => (
        <span className="flex justify-end gap-4 whitespace-nowrap">
          <Link to={`/app/docentes/${d._id}/editar`} className="font-semibold text-brand hover:underline">
            Editar
          </Link>
          {d.activo === false ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() => cambiarEstado(d, true)}
              className="font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
            >
              Reactivar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorEstado(null);
                setPorDesactivar(d);
              }}
              className="font-semibold text-red-500 hover:text-red-700"
            >
              Desactivar
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <Topbar title="Control de Personal Docente" />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar docente por nombre o código..." />
          <Select
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            aria-label="Filtrar por departamento"
            className="w-auto max-w-xs bg-white"
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
          <Link to="/app/docentes/nuevo" className={buttonClass("primary", "ml-auto")}>
            + Registrar Docente
          </Link>
        </div>

        {errorEstado && !porDesactivar && (
          <p role="alert" className="text-sm font-medium text-red-600">{errorEstado}</p>
        )}

        <DataTable
          columns={columnas}
          rows={visibles}
          rowKey={(d) => d._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length ? "Ningún docente coincide con los filtros." : "Aún no hay docentes registrados."}
        />

        {data && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            resumen={`Mostrando ${visibles.length} de ${data.length} docentes registrados`}
          />
        )}
      </div>

      <ConfirmDialog
        open={porDesactivar !== null}
        title="¿Desactivar docente?"
        confirmLabel="Desactivar"
        busy={procesando}
        error={errorEstado}
        onConfirm={() => porDesactivar && cambiarEstado(porDesactivar, false)}
        onCancel={() => setPorDesactivar(null)}
      >
        <strong>{porDesactivar?.nombre}</strong> ya no podrá iniciar sesión ni iniciar prácticas. Sus
        materias y reportes se conservan, y puede reactivarlo cuando lo necesite.
      </ConfirmDialog>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

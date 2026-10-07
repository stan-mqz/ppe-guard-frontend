import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { eliminarMateria, listarMateriasDetalle } from "@/api/materiasDetalle";
import { buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type Column } from "@/components/DataTable";
import { EppTags } from "@/components/EppTag";
import { Select } from "@/components/Field";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/useToast";
import type { MateriaVista } from "@/types/portal";
import { coincide } from "@/utils/format";

export const GestionMateriasPage = () => {
  const { data, loading, error, reload } = useAsync(
    () => listarMateriasDetalle(),
    [],
    "No se pudieron cargar las materias",
  );
  const { toast, setToast, cerrar } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [facultad, setFacultad] = useState("");
  const [porEliminar, setPorEliminar] = useState<MateriaVista | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const facultades = useMemo(() => [...new Set(data?.map((m) => m.facultad))].sort(), [data]);
  const filtradas = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          (!facultad || m.facultad === facultad) &&
          coincide(busqueda, m.nombre, m.codigo, m.docente_nombre, m.aula),
      ),
    [data, busqueda, facultad],
  );
  const { page, totalPages, setPage, visibles } = usePagination(filtradas);

  const eliminar = async () => {
    if (!porEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarMateria(porEliminar._id);
      setToast(`Se eliminó la materia ${porEliminar.nombre}.`);
      setPorEliminar(null);
      reload();
    } catch (e) {
      setErrorEliminar(getApiErrorMessage(e, "No se pudo eliminar la materia."));
    } finally {
      setEliminando(false);
    }
  };

  const columnas: Column<MateriaVista>[] = [
    {
      header: "Código",
      cell: (m) => (
        <span className="whitespace-nowrap font-semibold text-accent">
          {m.codigo ? `${m.codigo} • Sec ${m.seccion ?? "—"}` : "—"}
        </span>
      ),
    },
    { header: "Nombre de materia", cell: (m) => <span className="font-semibold text-slate-800">{m.nombre}</span> },
    { header: "Docente", cell: (m) => m.docente_nombre ?? "Sin asignar", className: "text-slate-600" },
    { header: "Lugar / Lab", cell: (m) => m.aula, className: "text-slate-600" },
    { header: "EPP requerido", cell: (m) => <EppTags epp={m.epp} /> },
    {
      header: "Acciones",
      align: "right",
      cell: (m) => (
        <span className="flex justify-end gap-4 whitespace-nowrap">
          <Link to={`/app/gestion-materias/${m._id}/editar`} className="font-semibold text-brand hover:underline">
            Editar
          </Link>
          <button
            type="button"
            onClick={() => {
              setErrorEliminar(null);
              setPorEliminar(m);
            }}
            className="font-semibold text-red-500 hover:text-red-700"
          >
            Eliminar
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <Topbar title="Gestión de Materias e Indumentarias" />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar materia, código o docente..." />
          <Select
            value={facultad}
            onChange={(e) => setFacultad(e.target.value)}
            aria-label="Filtrar por facultad"
            className="w-auto max-w-xs bg-white"
          >
            <option value="">Facultad: Todas</option>
            {facultades.map((f) => (
              <option key={f} value={f}>
                Facultad: {f.replace(/^Facultad de /, "")}
              </option>
            ))}
          </Select>
          <Link to="/app/gestion-materias/nueva" className={buttonClass("primary", "ml-auto")}>
            + Nueva Materia
          </Link>
        </div>

        <DataTable
          columns={columnas}
          rows={visibles}
          rowKey={(m) => m._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={
            data?.length ? "Ninguna materia coincide con los filtros." : "Aún no hay materias registradas."
          }
        />

        {data && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            resumen={`Mostrando ${visibles.length} de ${data.length} materias registradas`}
          />
        )}
      </div>

      <ConfirmDialog
        open={porEliminar !== null}
        title="¿Eliminar materia?"
        confirmLabel="Eliminar"
        busy={eliminando}
        error={errorEliminar}
        onConfirm={eliminar}
        onCancel={() => setPorEliminar(null)}
      >
        Se eliminará <strong>{porEliminar?.nombre}</strong>
        {porEliminar?.codigo && ` (${porEliminar.codigo} • Sec ${porEliminar.seccion})`} junto con su
        historial de prácticas. {porEliminar?.alumnos_ids.length ?? 0} alumnos inscritos perderán el acceso.
        Esta acción no se puede deshacer.
      </ConfirmDialog>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

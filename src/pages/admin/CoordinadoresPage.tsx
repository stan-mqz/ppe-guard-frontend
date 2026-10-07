import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { cambiarEstadoUsuario, listarUsuarios } from "@/api/usuariosGestion";
import { buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type Column } from "@/components/DataTable";
import { Select } from "@/components/Field";
import { SearchInput } from "@/components/SearchInput";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import type { UsuarioDetalle } from "@/types/portal";
import { coincide, iniciales } from "@/utils/format";

export const CoordinadoresPage = () => {
  const { data, loading, error, reload } = useAsync(
    () => listarUsuarios("coordinador"),
    [],
    "No se pudo cargar la lista de coordinadores",
  );
  const { toast, setToast, cerrar } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [facultad, setFacultad] = useState("");
  const [porDesactivar, setPorDesactivar] = useState<UsuarioDetalle | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const facultades = useMemo(
    () => [...new Set(data?.flatMap((c) => (c.facultad ? [c.facultad] : [])))].sort(),
    [data],
  );
  const filtrados = useMemo(
    () => (data ?? []).filter((c) => (!facultad || c.facultad === facultad) && coincide(busqueda, c.nombre, c.codigo)),
    [data, busqueda, facultad],
  );

  const cambiarEstado = async (coordinador: UsuarioDetalle, activo: boolean) => {
    setProcesando(true);
    setErrorEstado(null);
    try {
      await cambiarEstadoUsuario(coordinador._id, activo);
      setToast(`${coordinador.nombre} fue ${activo ? "reactivado" : "desactivado"}.`);
      setPorDesactivar(null);
      reload();
    } catch (e) {
      setErrorEstado(getApiErrorMessage(e, "No se pudo cambiar el estado del coordinador."));
    } finally {
      setProcesando(false);
    }
  };

  const columnas: Column<UsuarioDetalle>[] = [
    { header: "Código empl.", cell: (c) => c.codigo, className: "whitespace-nowrap text-slate-500" },
    {
      header: "Coordinador",
      cell: (c) => (
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {iniciales(c.nombre)}
          </span>
          <span className="font-semibold text-slate-800">{c.nombre}</span>
          {c.activo === false && <span className="text-xs font-semibold text-slate-400">(Inactivo)</span>}
        </span>
      ),
    },
    { header: "Facultad asignada", cell: (c) => c.facultad ?? "Sin asignar", className: "text-slate-600" },
    {
      header: "Materias bajo acceso",
      cell: (c) => `${c.materias_count ?? 0} Materia${c.materias_count === 1 ? "" : "s"} Activa${c.materias_count === 1 ? "" : "s"}`,
      className: "text-slate-600",
    },
    {
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <span className="flex justify-end gap-4 whitespace-nowrap">
          <Link to={`/app/coordinadores/${c._id}/editar`} className="font-semibold text-brand hover:underline">
            Editar
          </Link>
          {c.activo === false ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() => cambiarEstado(c, true)}
              className="font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
            >
              Reactivar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorEstado(null);
                setPorDesactivar(c);
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
      <Topbar title="Panel de Administración - Gestión de Coordinadores UNIVO" />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar coordinador por nombre o ID..." />
          <Select
            value={facultad}
            onChange={(e) => setFacultad(e.target.value)}
            aria-label="Filtrar por facultad"
            className="w-auto max-w-xs bg-white"
          >
            <option value="">Todas las Facultades</option>
            {facultades.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
          <Link to="/app/coordinadores/nuevo" className={buttonClass("primary", "ml-auto")}>
            + Registrar Nuevo Coordinador
          </Link>
        </div>

        {errorEstado && !porDesactivar && (
          <p role="alert" className="text-sm font-medium text-red-600">{errorEstado}</p>
        )}

        <DataTable
          columns={columnas}
          rows={filtrados}
          rowKey={(c) => c._id}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length ? "Ningún coordinador coincide con los filtros." : "Aún no hay coordinadores registrados."}
        />

        {data && (
          <p className="text-sm text-slate-500">
            Mostrando {filtrados.length} coordinador{filtrados.length === 1 ? "" : "es"} registrado
            {filtrados.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={porDesactivar !== null}
        title="¿Desactivar coordinador?"
        confirmLabel="Desactivar"
        busy={procesando}
        error={errorEstado}
        onConfirm={() => porDesactivar && cambiarEstado(porDesactivar, false)}
        onCancel={() => setPorDesactivar(null)}
      >
        <strong>{porDesactivar?.nombre}</strong> perderá el acceso al portal de coordinación. Las materias
        y docentes de su facultad se conservan, y puede reactivarlo cuando lo necesite.
      </ConfirmDialog>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

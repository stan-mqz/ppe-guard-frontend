import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getApiErrorMessage } from "@/api/client";
import { USE_MOCKS } from "@/api/config";
import { listarFacultades } from "@/api/materiasDetalle";
import { crearCoordinador } from "@/api/usuarios";
import { actualizarUsuario, obtenerUsuario } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { Field, Input, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { Facultad } from "@/types/portal";

const LISTA = "/app/coordinadores";
const PERMISOS = ["Crear Materias", "Modificar EPP Obligatorio", "Enrolar Alumnos"];
// El formulario del diseño no pide contraseña: el coordinador entra con esta y la cambia en Mi Perfil.
const PASSWORD_TEMPORAL = "UNIVO*2026";

/** Alta y edición de coordinador: /app/coordinadores/nuevo y /:id/editar */
export const CoordinadorFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [facultades, coordinador] = await Promise.all([
        // PENDIENTE EN BACKEND: sin catálogo de facultades el campo es de texto libre.
        listarFacultades().catch(() => [] as Facultad[]),
        id ? obtenerUsuario(id) : null,
      ]);
      return { facultades, coordinador };
    },
    [id],
    "No se pudo cargar el formulario",
  );

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [facultad, setFacultad] = useState("");
  const [permisos, setPermisos] = useState<string[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const coordinador = data?.coordinador;
  useEffect(() => {
    if (!coordinador) return;
    setNombre(coordinador.nombre);
    setCorreo(coordinador.correo ?? "");
    setCodigo(coordinador.codigo);
    setFacultad(coordinador.facultad ?? "");
    setPermisos(coordinador.permisos ?? []);
  }, [coordinador]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (nombre.trim().length < 5) encontrados.nombre = "Ingrese el nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) encontrados.correo = "Ingrese un correo institucional válido.";
    if (USE_MOCKS ? !/^EMP-\d{5}$/i.test(codigo.trim()) : !codigo.trim()) {
      encontrados.codigo = USE_MOCKS ? "Use el formato EMP-00000." : "Ingrese el código de empleado.";
    }
    if (!facultad.trim()) encontrados.facultad = "Indique la facultad asignada.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    setErrorGuardar(null);
    const datos = { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() };
    try {
      // POST /usuarios/coordinadores solo recibe código, nombre y contraseña;
      // el resto de la ficha se completa con el PUT.
      const coordinadorId = id ?? (await crearCoordinador({ ...datos, password: PASSWORD_TEMPORAL }))._id;
      let fichaCompleta = true;
      try {
        await actualizarUsuario(coordinadorId, { ...datos, correo: correo.trim(), facultad: facultad.trim(), permisos });
      } catch (err) {
        // PENDIENTE EN BACKEND: PUT /usuarios/{id}. Al crear, el coordinador ya
        // quedó registrado; solo no se guardan correo, facultad ni permisos.
        const sinEndpoint = axios.isAxiosError(err) && [404, 405].includes(err.response?.status ?? 0);
        if (id || !sinEndpoint) throw err;
        fichaCompleta = false;
      }
      navigate(LISTA, {
        state: {
          toast: id
            ? "Coordinador actualizado."
            : `Coordinador registrado. Contraseña temporal: ${PASSWORD_TEMPORAL}` +
              (fichaCompleta ? "" : " (el servidor aún no guarda correo, facultad ni permisos)."),
        },
      });
    } catch (err) {
      setErrorGuardar(getApiErrorMessage(err, "No se pudo guardar el coordinador."));
      setGuardando(false);
    }
  };

  return (
    <>
      <Topbar title={id ? "Editar Coordinador de Facultad - UNIVO" : "Registrar Nuevo Coordinador de Facultad - UNIVO"} />

      <div className="space-y-6 p-8">
        <BackLink to={LISTA}>Volver a la Lista de Coordinadores</BackLink>

        <Card className="max-w-[700px]">
          <h2 className="mb-6 text-xl font-bold text-slate-800">Información de Registro Institucional</h2>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <form onSubmit={guardar} noValidate className="space-y-4">
              <Field label="Nombre Completo" required error={errores.nombre}>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lic. Carlos Castillo" />
              </Field>
              <Field label="Correo Institucional" required error={errores.correo}>
                <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre.apellido@univo.edu.sv" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código de Empleado" required error={errores.codigo}>
                  <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. EMP-09214" />
                </Field>
                <Field label="Facultad Asignada" required error={errores.facultad}>
                  {data!.facultades.length > 0 ? (
                    <Select value={facultad} onChange={(e) => setFacultad(e.target.value)}>
                      <option value="">Seleccione una facultad</option>
                      {data!.facultades.map((f) => (
                        <option key={f.nombre}>{f.nombre}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={facultad} onChange={(e) => setFacultad(e.target.value)} placeholder="Ej. Facultad de Ciencias de la Salud" />
                  )}
                </Field>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-slate-700">Permisos de Control Asignados</legend>
                <div className="flex flex-wrap gap-2">
                  {PERMISOS.map((permiso) => {
                    const activo = permisos.includes(permiso);
                    return (
                      <label
                        key={permiso}
                        className={clsx(
                          "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-brand",
                          activo ? "border-brand bg-brand/5 text-brand" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0b3d63]"
                          checked={activo}
                          onChange={() => setPermisos(PERMISOS.filter((p) => (p === permiso ? !activo : permisos.includes(p))))}
                        />
                        {permiso}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {!id && (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  El coordinador ingresará con la contraseña temporal <strong>{PASSWORD_TEMPORAL}</strong> y
                  podrá cambiarla desde Mi Perfil.
                </p>
              )}

              {errorGuardar && <p role="alert" className="text-sm font-medium text-red-600">{errorGuardar}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to={LISTA} className={buttonClass("secondary")}>
                  Cancelar
                </Link>
                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar Coordinador"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
};

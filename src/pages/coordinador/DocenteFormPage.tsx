import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { USE_MOCKS } from "@/api/config";
import { guardarMateria, listarFacultades, listarMateriasDetalle } from "@/api/materiasDetalle";
import { crearDocente } from "@/api/usuarios";
import { actualizarUsuario, listarUsuarios, obtenerUsuario } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, Input, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import type { Facultad, MateriaVista, UsuarioDetalle } from "@/types/portal";
import { coincide } from "@/utils/format";

const LISTA = "/app/docentes";

const etiqueta = (m: MateriaVista) => `${m.codigo ?? m.carrera} • ${m.nombre}`;

/** Alta y edición de docente: /app/docentes/nuevo y /:id/editar */
export const DocenteFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  // El docente queda a cargo de un coordinador. El coordinador manda su propio
  // id; el admin elige cuál (GET /usuarios?rol=coordinador).
  const pideCoordinador = !id && session.payload.rol === "admin";
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [facultades, materias, docente, coordinadores] = await Promise.all([
        // PENDIENTE EN BACKEND: sin catálogo de facultades el campo es de texto libre.
        listarFacultades().catch(() => [] as Facultad[]),
        listarMateriasDetalle(),
        id ? obtenerUsuario(id) : null,
        pideCoordinador ? listarUsuarios("coordinador") : ([] as UsuarioDetalle[]),
      ]);
      return { facultades, materias, docente, coordinadores };
    },
    [id, pideCoordinador],
    "No se pudo cargar la ficha del docente",
  );

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [facultad, setFacultad] = useState("");
  const [password, setPassword] = useState("");
  const [coordinadorId, setCoordinadorId] = useState("");
  const [asignadas, setAsignadas] = useState<string[]>([]);
  const [buscador, setBuscador] = useState<string | null>(null); // null = caja cerrada
  const [porRemover, setPorRemover] = useState<MateriaVista | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.docente) return;
    const { docente, materias } = data;
    setNombre(docente.nombre);
    setCodigo(docente.codigo);
    setFacultad(docente.facultad ?? "");
    setAsignadas(materias.filter((m) => m.docente_id === docente._id).map((m) => m._id));
  }, [data]);

  const materias = useMemo(() => data?.materias ?? [], [data]);
  const originales = useMemo(
    () => (id ? materias.filter((m) => m.docente_id === id).map((m) => m._id) : []),
    [materias, id],
  );
  const sugerencias =
    buscador === null
      ? []
      : materias.filter((m) => !asignadas.includes(m._id) && coincide(buscador, m.nombre, m.codigo)).slice(0, 6);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (nombre.trim().length < 5) encontrados.nombre = "Ingrese el nombre completo del docente.";
    if (USE_MOCKS ? !/^DOC-\d{6}$/i.test(codigo.trim()) : !codigo.trim()) {
      encontrados.codigo = USE_MOCKS ? "Use el formato DOC-000000." : "Ingrese el código del docente.";
    }
    if (!facultad.trim()) encontrados.facultad = "Indique la facultad.";
    if (pideCoordinador && !coordinadorId) encontrados.coordinador = "Seleccione el coordinador a cargo.";
    if (!id && password.length < 8) encontrados.password = "La contraseña debe tener al menos 8 caracteres.";
    if (id && password && password.length < 8) encontrados.password = "La contraseña debe tener al menos 8 caracteres.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    setErrorGuardar(null);
    try {
      const datos = { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase(), facultad: facultad.trim() };
      const docenteId = id
        ? (await actualizarUsuario(id, { ...datos, ...(password ? { password } : {}) }))._id
        : (
            await crearDocente({
              ...datos,
              password,
              coordinador_id: pideCoordinador ? coordinadorId : session.payload.uid,
            })
          )._id;

      // La asignación vive en cada materia (materia.docente_id). PENDIENTE EN
      // BACKEND: PATCH /materias/{id} todavía no acepta docente_id.
      if (USE_MOCKS) await Promise.all([
        ...asignadas.filter((m) => !originales.includes(m)).map((m) => guardarMateria({ docente_id: docenteId }, m)),
        ...originales.filter((m) => !asignadas.includes(m)).map((m) => guardarMateria({ docente_id: "" }, m)),
      ]);
      navigate(LISTA, { state: { toast: id ? "Ficha del docente actualizada." : "Docente registrado correctamente." } });
    } catch (err) {
      setErrorGuardar(getApiErrorMessage(err, "No se pudo guardar la ficha del docente."));
      setGuardando(false);
    }
  };

  return (
    <>
      <Topbar title="Configurar Registro de Docente" />

      <div className="space-y-6 p-8">
        <BackLink to={LISTA}>Volver al control de docentes</BackLink>

        <Card className="max-w-[700px]">
          <h2 className="mb-6 text-xl font-bold text-slate-800">Ficha de Datos Docente</h2>

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
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Dra. María Elena Ramos" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código Interno" required error={errores.codigo}>
                  <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. DOC-202101" />
                </Field>
                <Field label="Facultad" required error={errores.facultad}>
                  {data!.facultades.length > 0 ? (
                    <Select value={facultad} onChange={(e) => setFacultad(e.target.value)}>
                      <option value="">Seleccione una facultad</option>
                      {data!.facultades.map((f) => (
                        <option key={f.nombre}>{f.nombre}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={facultad} onChange={(e) => setFacultad(e.target.value)} placeholder="Ej. Facultad de Ingeniería y Arquitectura" />
                  )}
                </Field>
              </div>

              {pideCoordinador && (
                <Field label="Coordinador a Cargo" required error={errores.coordinador}>
                  <Select value={coordinadorId} onChange={(e) => setCoordinadorId(e.target.value)}>
                    <option value="">
                      {data!.coordinadores.length > 0 ? "Seleccione un coordinador" : "No hay coordinadores registrados"}
                    </option>
                    {data!.coordinadores.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre} ({c.codigo})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label="Contraseña de Acceso Portal" required={!id} error={errores.password}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={id ? "Dejar en blanco para conservar la actual" : "Mínimo 8 caracteres"}
                />
              </Field>

              {!USE_MOCKS ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Las materias se asignan al docente desde “Nueva Materia”: el servidor aún no permite
                  reasignar una materia ya creada.
                </p>
              ) : (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Materias Asignadas (Lista Dinámica)</p>
                <ul className="space-y-2">
                  {materias
                    .filter((m) => asignadas.includes(m._id))
                    .map((m) => (
                      <li key={m._id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2.5 text-sm">
                        <span className="font-medium text-slate-800">{etiqueta(m)}</span>
                        <button
                          type="button"
                          onClick={() => setPorRemover(m)}
                          className="font-semibold text-red-500 hover:text-red-700"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                </ul>

                <div className="relative mt-2">
                  {buscador === null ? (
                    <button
                      type="button"
                      onClick={() => setBuscador("")}
                      className="w-full rounded-lg border-2 border-dashed border-slate-300 px-3 py-3 text-left text-sm text-slate-500 hover:border-brand hover:text-brand"
                    >
                      Haga clic para escribir otra materia y asignar...
                    </button>
                  ) : (
                    <>
                      <Input
                        autoFocus
                        value={buscador}
                        onChange={(e) => setBuscador(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setBuscador(null)}
                        onBlur={() => setBuscador(null)}
                        placeholder="Escriba el nombre o código de la materia..."
                        aria-label="Buscar materia para asignar"
                      />
                      <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {sugerencias.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-slate-500">No hay materias que coincidan.</li>
                        ) : (
                          sugerencias.map((m) => (
                            <li key={m._id}>
                              <button
                                type="button"
                                // mousedown ocurre antes del blur del input, que cierra la lista.
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setAsignadas((a) => [...a, m._id]);
                                  setBuscador(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-800">{etiqueta(m)}</span>
                                {m.docente_nombre && m.docente_id !== id && (
                                  <span className="block text-xs text-amber-600">
                                    Actualmente asignada a {m.docente_nombre}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              )}

              {errorGuardar && <p role="alert" className="text-sm font-medium text-red-600">{errorGuardar}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to={LISTA} className={buttonClass("secondary")}>
                  Cancelar
                </Link>
                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar Ficha Docente"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={porRemover !== null}
        title="¿Remover materia?"
        confirmLabel="Remover"
        onConfirm={() => {
          setAsignadas((a) => a.filter((m) => m !== porRemover?._id));
          setPorRemover(null);
        }}
        onCancel={() => setPorRemover(null)}
      >
        <strong>{porRemover && etiqueta(porRemover)}</strong> dejará de estar asignada a este docente y
        quedará sin docente al guardar la ficha.
      </ConfirmDialog>
    </>
  );
};

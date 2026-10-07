import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { USE_MOCKS } from "@/api/config";
import { guardarMateria, listarFacultades, obtenerMateria } from "@/api/materiasDetalle";
import { listarPracticas } from "@/api/practices";
import { listarUsuarios } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { Field, Input, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { PracticeInDB } from "@/types";
import type { Facultad, MateriaPayload, UsuarioDetalle } from "@/types/portal";
import { EPP_OPCIONES, etiquetaEpp, listaEpp } from "@/utils/materia";

const LISTA = "/app/gestion-materias";

const VACIA: MateriaPayload = {
  nombre: "",
  codigo: "",
  seccion: "",
  facultad: "",
  carrera: "",
  docente_id: "",
  aula: "",
  epp: [],
  area: "civil",
};

type Errores = Partial<Record<keyof MateriaPayload, string>>;

// Código, sección y EPP por materia son PENDIENTE EN BACKEND: solo se exigen
// en la demo. El backend real toma el EPP del catálogo según el área.
function validar(m: MateriaPayload): Errores {
  const e: Errores = {};
  if (m.nombre.trim().length < 3) e.nombre = "Ingrese el nombre de la materia.";
  if (USE_MOCKS && !/^[A-Za-z]{2,4}\d{3}$/.test(m.codigo.trim())) e.codigo = "Use el formato de código institucional, p. ej. QO101.";
  if (USE_MOCKS && !m.seccion.trim()) e.seccion = "Indique la sección.";
  if (!m.facultad.trim()) e.facultad = "Indique la facultad.";
  if (!m.carrera.trim()) e.carrera = "Indique la carrera.";
  if (!m.docente_id.trim()) e.docente_id = "Indique el docente asignado.";
  else if (!USE_MOCKS && !/^[0-9a-f]{24}$/i.test(m.docente_id.trim())) e.docente_id = "El ID del docente tiene 24 caracteres hexadecimales.";
  if (!m.aula.trim()) e.aula = "Indique el laboratorio, clínica o taller.";
  if (USE_MOCKS && m.epp.length === 0) e.epp = "Seleccione al menos un EPP requerido.";
  return e;
}

/** Alta y edición de materia: /app/gestion-materias/nueva y /:id/editar */
export const MateriaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
    async () => {
      // PENDIENTE EN BACKEND: catálogo de facultades y listado de docentes. Si
      // fallan, esos campos pasan a ser de texto libre (el docente, por su ID).
      const [facultades, docentes, catalogo, materia] = await Promise.all([
        listarFacultades().catch(() => [] as Facultad[]),
        listarUsuarios("docente").catch(() => [] as UsuarioDetalle[]),
        listarPracticas().catch(() => [] as PracticeInDB[]),
        id ? obtenerMateria(id) : null,
      ]);
      return {
        facultades,
        docentes: docentes.filter((d) => d.activo !== false || d._id === materia?.docente_id),
        catalogo,
        materia,
      };
    },
    [id],
    "No se pudo cargar el formulario",
  );

  const [form, setForm] = useState<MateriaPayload>(VACIA);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const materia = data?.materia;
  useEffect(() => {
    if (!materia) return;
    setForm({
      nombre: materia.nombre,
      codigo: materia.codigo ?? "",
      seccion: materia.seccion ?? "",
      facultad: materia.facultad,
      carrera: materia.carrera,
      docente_id: materia.docente_id,
      aula: materia.aula,
      epp: materia.epp,
      area: materia.area,
    });
  }, [materia]);

  const set = <K extends keyof MateriaPayload>(campo: K, valor: MateriaPayload[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));
  // Incluye prendas que la materia ya tenga y no estén en el catálogo local.
  const opcionesEpp = [...new Set([...EPP_OPCIONES, ...(materia?.epp ?? [])])];
  // El backend real no permite reasignar el docente de una materia (PATCH lo ignora).
  const noReasignable = Boolean(id) && !USE_MOCKS;
  // Al editar, la facultad guardada puede no estar en el catálogo.
  const opcionesFacultad = [...new Set([...(data?.facultades.map((f) => f.nombre) ?? []), ...(materia ? [materia.facultad] : [])])];
  const carreras = [
    ...new Set([
      ...(data?.facultades.find((f) => f.nombre === form.facultad)?.carreras ?? []),
      ...(materia?.facultad === form.facultad ? [materia.carrera] : []),
    ]),
  ];

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados = validar(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await guardarMateria(
        {
          ...form,
          nombre: form.nombre.trim(),
          codigo: form.codigo.trim().toUpperCase(),
          seccion: form.seccion.trim().toUpperCase(),
          facultad: form.facultad.trim(),
          carrera: form.carrera.trim(),
          docente_id: form.docente_id.trim(),
          aula: form.aula.trim(),
        },
        id,
      );
      navigate(LISTA, { state: { toast: id ? "Materia actualizada." : "Materia creada correctamente." } });
    } catch (err) {
      setErrorGuardar(getApiErrorMessage(err, "No se pudo guardar la materia."));
      setGuardando(false);
    }
  };

  return (
    <>
      <Topbar title={id ? "Editar Materia" : "Configurar Nueva Materia"} />

      <div className="space-y-6 p-8">
        <BackLink to={LISTA}>Volver a la gestión de materias</BackLink>

        <Card className="max-w-[700px]">
          <h2 className="mb-6 text-xl font-bold text-slate-800">
            {id ? "Editar Materia / Clase Regulada" : "Nueva Materia / Clase Regulada"}
          </h2>

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
              <Field label="Nombre de la Materia" required error={errores.nombre}>
                <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Química Orgánica I" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código" required={USE_MOCKS} error={errores.codigo}>
                  <Input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Ej. QO101" />
                </Field>
                <Field label="Sección" required={USE_MOCKS} error={errores.seccion}>
                  <Input value={form.seccion} onChange={(e) => set("seccion", e.target.value)} placeholder="Ej. A" maxLength={3} />
                </Field>

                <Field label="Facultad" required error={errores.facultad}>
                  {data!.facultades.length > 0 ? (
                    <Select
                      value={form.facultad}
                      onChange={(e) => setForm((f) => ({ ...f, facultad: e.target.value, carrera: "" }))}
                    >
                      <option value="">Seleccione una facultad</option>
                      {opcionesFacultad.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={form.facultad} onChange={(e) => set("facultad", e.target.value)} placeholder="Ej. Facultad de Ingeniería y Arquitectura" />
                  )}
                </Field>
                <Field label="Carrera" required error={errores.carrera}>
                  {data!.facultades.length > 0 ? (
                    <Select value={form.carrera} onChange={(e) => set("carrera", e.target.value)} disabled={!form.facultad}>
                      <option value="">{form.facultad ? "Seleccione una carrera" : "Primero seleccione la facultad"}</option>
                      {carreras.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={form.carrera} onChange={(e) => set("carrera", e.target.value)} placeholder="Ej. Ingeniería Civil" />
                  )}
                </Field>

                <Field
                  label={data!.docentes.length > 0 ? "Docente Asignado" : "Docente Asignado (ID)"}
                  required
                  error={errores.docente_id}
                >
                  {data!.docentes.length > 0 ? (
                    <Select value={form.docente_id} onChange={(e) => set("docente_id", e.target.value)} disabled={noReasignable}>
                      <option value="">Seleccione un docente</option>
                      {data!.docentes.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.nombre} ({d.codigo})
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={form.docente_id}
                      onChange={(e) => set("docente_id", e.target.value)}
                      disabled={noReasignable}
                      placeholder="_id del docente (24 caracteres)"
                    />
                  )}
                </Field>
                <Field label="Ubicación / Laboratorio" required error={errores.aula}>
                  <Input value={form.aula} onChange={(e) => set("aula", e.target.value)} placeholder="Ej. Laboratorio B-2" />
                </Field>
              </div>

              <Field label="Área de Práctica" required>
                <Select
                  value={form.area}
                  onChange={(e) => set("area", e.target.value as MateriaPayload["area"])}
                  disabled={Boolean(id)}
                >
                  <option value="civil">Civil (ingeniería, talleres)</option>
                  <option value="medicina">Medicina (salud, laboratorios clínicos)</option>
                </Select>
              </Field>
              {id && (
                <p className="text-xs text-slate-500">
                  El área{noReasignable ? " y el docente asignado" : ""} no se pueden cambiar después de crear la
                  materia.
                </p>
              )}

              {!USE_MOCKS ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">EPP requerido: </span>
                  {listaEpp(data!.catalogo.find((c) => c.area === form.area)?.ppe_requerido ?? []) ||
                    "sin EPP configurado para esta área"}
                  . Lo define el área de práctica.
                </div>
              ) : (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-slate-700">
                  EPP Requerido <span className="text-red-500">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {opcionesEpp.map((prenda) => {
                    const activo = form.epp.includes(prenda);
                    return (
                      <label
                        key={prenda}
                        className={clsx(
                          "cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-brand",
                          activo ? "border-brand bg-brand text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={activo}
                          onChange={() =>
                            // Se conserva el orden del catálogo, sin importar el orden de los clics.
                            set("epp", opcionesEpp.filter((p) => (p === prenda ? !activo : form.epp.includes(p))))
                          }
                        />
                        {etiquetaEpp(prenda)}
                      </label>
                    );
                  })}
                </div>
                {errores.epp && <p className="mt-1 text-xs font-medium text-red-600">{errores.epp}</p>}
              </fieldset>
              )}

              {errorGuardar && <p role="alert" className="text-sm font-medium text-red-600">{errorGuardar}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to={LISTA} className={buttonClass("secondary")}>
                  Cancelar
                </Link>
                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar Materia"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
};

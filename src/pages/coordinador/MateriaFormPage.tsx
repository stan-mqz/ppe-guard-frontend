import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { guardarMateria, listarFacultades, obtenerMateria } from "@/api/materiasDetalle";
import { listarUsuarios } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { Field, Input, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { MateriaPayload } from "@/types/portal";
import { EPP_OPCIONES } from "@/utils/materia";

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

function validar(m: MateriaPayload): Errores {
  const e: Errores = {};
  if (m.nombre.trim().length < 3) e.nombre = "Ingrese el nombre de la materia.";
  if (!/^[A-Za-z]{2,4}\d{3}$/.test(m.codigo.trim())) e.codigo = "Use el formato de código institucional, p. ej. QO101.";
  if (!m.seccion.trim()) e.seccion = "Indique la sección.";
  if (!m.facultad) e.facultad = "Seleccione la facultad.";
  if (!m.carrera) e.carrera = "Seleccione la carrera.";
  if (!m.docente_id) e.docente_id = "Seleccione el docente asignado.";
  if (!m.aula.trim()) e.aula = "Indique el laboratorio, clínica o taller.";
  if (m.epp.length === 0) e.epp = "Seleccione al menos un EPP requerido.";
  return e;
}

/** Alta y edición de materia: /app/gestion-materias/nueva y /:id/editar */
export const MateriaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [facultades, docentes, materia] = await Promise.all([
        listarFacultades(),
        listarUsuarios("docente"),
        id ? obtenerMateria(id) : null,
      ]);
      return { facultades, docentes: docentes.filter((d) => d.activo !== false || d._id === materia?.docente_id), materia };
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
  const carreras = data?.facultades.find((f) => f.nombre === form.facultad)?.carreras ?? [];

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
          aula: form.aula.trim(),
          // El backend agrupa el EPP por área; se deduce de la facultad.
          area: /salud|medicina/i.test(form.facultad) ? "medicina" : "civil",
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
                <Field label="Código" required error={errores.codigo}>
                  <Input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Ej. QO101" />
                </Field>
                <Field label="Sección" required error={errores.seccion}>
                  <Input value={form.seccion} onChange={(e) => set("seccion", e.target.value)} placeholder="Ej. A" maxLength={3} />
                </Field>

                <Field label="Facultad" required error={errores.facultad}>
                  <Select
                    value={form.facultad}
                    onChange={(e) => setForm((f) => ({ ...f, facultad: e.target.value, carrera: "" }))}
                  >
                    <option value="">Seleccione una facultad</option>
                    {data!.facultades.map((f) => (
                      <option key={f.nombre}>{f.nombre}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Carrera" required error={errores.carrera}>
                  <Select value={form.carrera} onChange={(e) => set("carrera", e.target.value)} disabled={!form.facultad}>
                    <option value="">{form.facultad ? "Seleccione una carrera" : "Primero seleccione la facultad"}</option>
                    {carreras.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Docente Asignado" required error={errores.docente_id}>
                  <Select value={form.docente_id} onChange={(e) => set("docente_id", e.target.value)}>
                    <option value="">Seleccione un docente</option>
                    {data!.docentes.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.nombre} ({d.codigo})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Ubicación / Laboratorio" required error={errores.aula}>
                  <Input value={form.aula} onChange={(e) => set("aula", e.target.value)} placeholder="Ej. Laboratorio B-2" />
                </Field>
              </div>

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
                        {prenda}
                      </label>
                    );
                  })}
                </div>
                {errores.epp && <p className="mt-1 text-xs font-medium text-red-600">{errores.epp}</p>}
              </fieldset>

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

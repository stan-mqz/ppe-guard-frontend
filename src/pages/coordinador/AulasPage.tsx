import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router-dom";
import { crearMateria, listarMaterias } from "@/api/materias";
import { getApiErrorMessage } from "@/api/client";
import { getSession, hasRole } from "@/auth/session";
import type { Area, MateriaInDB } from "@/types";

const PAGE_SIZE = 8;

/**
 * Loader: react-router lo ejecuta antes de renderizar la ruta (y de nuevo tras
 * cada action exitosa gracias a la revalidación automática). Una ruta solo
 * admite un `loader`, así que aquí se combina la protección por rol
 * (equivalente a requireAuth("coordinador")) con la carga de datos.
 *
 * El backend (GET /api/v1/materias) todavía no soporta skip/limit, así que el
 * paginado es client-side por ahora -> cuando se agregue paginación real al
 * endpoint, solo hay que mover `page`/`PAGE_SIZE` a los query params de
 * listarMaterias().
 */
export async function aulasLoader({ request }: { request: Request }) {
  const session = getSession();
  if (!session) throw redirect(`/login?from=${encodeURIComponent("/app/aulas")}`);
  if (!hasRole(session, "coordinador")) throw redirect("/app");

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");

  const todas = await listarMaterias();
  const totalPages = Math.max(1, Math.ceil(todas.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const materias = todas.slice(start, start + PAGE_SIZE);

  return { materias, page, totalPages, total: todas.length };
}

export async function aulasAction({ request }: { request: Request }) {
  const formData = await request.formData();
  try {
    await crearMateria({
      nombre: String(formData.get("nombre")),
      area: formData.get("area") as Area,
      carrera: String(formData.get("carrera")),
      facultad: String(formData.get("facultad")),
      aula: String(formData.get("aula")),
      docente_id: String(formData.get("docente_id")),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getApiErrorMessage(error, "No se pudo crear la materia") };
  }
}

const inputClass = "mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm";
const labelClass = "block text-xs font-semibold text-slate-600";

export function AulasPage() {
  const { materias, page, totalPages, total } = useLoaderData() as {
    materias: MateriaInDB[];
    page: number;
    totalPages: number;
    total: number;
  };
  const actionData = useActionData() as { ok: boolean; error?: string } | undefined;
  const navigation = useNavigation();
  const [, setSearchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-slate-900">Materias ({total})</h1>

      <Form method="post" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className={labelClass}>Nombre</label>
          <input name="nombre" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Área</label>
          <select name="area" required className={inputClass}>
            <option value="civil">Civil</option>
            <option value="medicina">Medicina</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Carrera</label>
          <input name="carrera" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Facultad</label>
          <input name="facultad" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Aula</label>
          <input name="aula" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>ID Docente</label>
          <input name="docente_id" required className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isSubmitting ? "Creando..." : "Crear materia"}
        </button>
      </Form>

      {actionData?.ok === false && (
        <p className="mt-3 text-sm font-medium text-red-600">{actionData.error}</p>
      )}

      <table className="mt-6 w-full overflow-hidden rounded-lg bg-white text-sm shadow-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Área</th>
            <th className="px-4 py-3">Carrera</th>
            <th className="px-4 py-3">Aula</th>
            <th className="px-4 py-3">Docente</th>
            <th className="px-4 py-3">Alumnos</th>
          </tr>
        </thead>
        <tbody>
          {materias.map((materia) => (
            <tr key={materia._id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">{materia.nombre}</td>
              <td className="px-4 py-3 capitalize">{materia.area}</td>
              <td className="px-4 py-3">{materia.carrera}</td>
              <td className="px-4 py-3">{materia.aula}</td>
              <td className="px-4 py-3">{materia.docente_id}</td>
              <td className="px-4 py-3">{materia.alumnos_ids.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setSearchParams({ page: String(page - 1) })}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ page: String(page + 1) })}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
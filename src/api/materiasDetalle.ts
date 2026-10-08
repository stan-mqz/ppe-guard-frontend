import { apiClient } from "@/api/client";
import { listarPracticas } from "@/api/practices";
import { obtenerUsuario } from "@/api/usuarios";
import type { PracticeInDB } from "@/types";
import type { Facultad, MateriaDetalle, MateriaPayload, MateriaVista, TemaPractica } from "@/types/portal";

// El catálogo de EPP por área es secundario: si falla, la materia se muestra sin EPP.
const catalogoEpp = () => listarPracticas().catch(() => [] as PracticeInDB[]);

function conEpp(materia: MateriaDetalle, catalogo: PracticeInDB[]): MateriaVista {
  return {
    ...materia,
    epp: materia.epp ?? catalogo.find((p) => p.area === materia.area)?.ppe_requerido ?? [],
  };
}

/**
 * El backend no envía el nombre del docente en la materia: se resuelve con
 * GET /usuarios/{id} (una petición por docente distinto). Si falla (403: el
 * docente está fuera del cargo de quien pregunta), la materia queda sin nombre.
 */
async function conDocente(materias: MateriaDetalle[]): Promise<MateriaDetalle[]> {
  const ids = [...new Set(materias.filter((m) => !m.docente_nombre && m.docente_id).map((m) => m.docente_id))];
  if (ids.length === 0) return materias;
  const nombres = new Map(
    await Promise.all(
      ids.map(async (id) => [id, await obtenerUsuario(id).then((u) => u.nombre, () => undefined)] as const),
    ),
  );
  return materias.map((m) => ({ ...m, docente_nombre: m.docente_nombre ?? nombres.get(m.docente_id) }));
}

/**
 * GET /materias con el EPP y el docente de cada materia ya resueltos. El
 * backend filtra por rol: el docente recibe las suyas, el coordinador las de su
 * cargo y el admin todas. El alumno recibe 403: lo suyo es GET /alumno/materias
 * (src/api/alumno.ts).
 */
export async function listarMateriasDetalle(params?: { docente_id?: string }): Promise<MateriaVista[]> {
  const [{ data }, catalogo] = await Promise.all([
    apiClient.get<MateriaDetalle[]>("/materias", { params }),
    catalogoEpp(),
  ]);
  return (await conDocente(data)).map((m) => conEpp(m, catalogo));
}

/** GET /materias/{id} (403 si la materia no es del docente o está fuera del cargo del coordinador). */
export async function obtenerMateria(materiaId: string): Promise<MateriaVista> {
  const [{ data }, catalogo] = await Promise.all([
    apiClient.get<MateriaDetalle>(`/materias/${materiaId}`),
    catalogoEpp(),
  ]);
  return conEpp((await conDocente([data]))[0], catalogo);
}

/**
 * POST /materias (crear) o PATCH /materias/{id} (editar).
 * Al editar, el backend solo aplica nombre, carrera, facultad y aula; `area` y
 * `docente_id` no se pueden cambiar. `codigo`, `seccion` y `epp` son PENDIENTE
 * EN BACKEND (hoy los ignora: el EPP sale del catálogo por área).
 */
export async function guardarMateria(payload: Partial<MateriaPayload>, materiaId?: string): Promise<MateriaDetalle> {
  const { data } = materiaId
    ? await apiClient.patch<MateriaDetalle>(`/materias/${materiaId}`, payload)
    : await apiClient.post<MateriaDetalle>("/materias", payload);
  return data;
}

/** PENDIENTE EN BACKEND: DELETE /api/v1/materias/{materia_id} */
export async function eliminarMateria(materiaId: string): Promise<void> {
  await apiClient.delete(`/materias/${materiaId}`);
}

/** PENDIENTE EN BACKEND: GET /api/v1/materias/{materia_id}/temas -> prácticas del programa. */
export async function listarTemas(materiaId: string): Promise<TemaPractica[]> {
  const { data } = await apiClient.get<TemaPractica[]>(`/materias/${materiaId}/temas`);
  return data;
}

/** PENDIENTE EN BACKEND: GET /api/v1/catalogos/facultades */
export async function listarFacultades(): Promise<Facultad[]> {
  const { data } = await apiClient.get<Facultad[]>("/catalogos/facultades");
  return data;
}

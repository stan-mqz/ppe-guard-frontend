import { apiClient } from "@/api/client";
import { listarPracticas } from "@/api/practices";
import type { AsistenciaAlumno, MateriaAlumno, PracticeInDB } from "@/types";
import type { MateriaAlumnoVista } from "@/types/portal";

// Endpoints exclusivos del rol alumno (el admin también recibe 403).

/**
 * GET /alumno/materias: las materias donde el alumno está matriculado, por
 * nombre y con el nombre del docente. El EPP sale del catálogo por área
 * (GET /practices, público); si el catálogo falla, la materia se muestra sin EPP.
 */
export async function listarMisMaterias(): Promise<MateriaAlumnoVista[]> {
  const [{ data }, catalogo] = await Promise.all([
    apiClient.get<(MateriaAlumno & Partial<MateriaAlumnoVista>)[]>("/alumno/materias"),
    listarPracticas().catch(() => [] as PracticeInDB[]),
  ]);
  return data.map((m) => ({
    ...m,
    epp: m.epp ?? catalogo.find((p) => p.area === m.area)?.ppe_requerido ?? [],
  }));
}

/**
 * GET /alumno/asistencias: sus asistencias, de la más reciente a la más
 * antigua, con materia_id, materia_nombre y docente_nombre.
 */
export async function listarMisAsistencias(): Promise<AsistenciaAlumno[]> {
  const { data } = await apiClient.get<AsistenciaAlumno[]>("/alumno/asistencias");
  return data;
}

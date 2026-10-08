import axios from "axios";
import { apiClient } from "@/api/client";
import type { ConfirmarRequest, PracticaActivaResponse, PracticaInDB } from "@/types";
import type { PracticaDetalle, PracticaNueva, ReporteDetalle } from "@/types/portal";

// Sesiones de práctica (POST /practicas, ...). El catálogo de EPP por área
// vive en src/api/practices.ts.

/**
 * POST /practicas: enciende la cámara del servidor y arranca la detección.
 * Solo puede haber una práctica activa en todo el servidor: 409 si ya hay otra,
 * con un mensaje distinto según sea propia o de otro docente. Si la cámara no
 * abre (500) la práctica no queda creada.
 * `numero` y `tema` son PENDIENTE EN BACKEND (hoy solo usa materia_id).
 */
export async function iniciarPractica(payload: PracticaNueva): Promise<PracticaDetalle> {
  const { data } = await apiClient.post<PracticaDetalle>("/practicas", payload);
  return data;
}

/**
 * GET /practicas/active: la práctica en curso del docente que pregunta (el
 * admin ve la que haya). Si la tiene otro docente llega null, y es el 409 de
 * POST /practicas el que lo avisa.
 */
export async function obtenerPracticaActiva(): Promise<PracticaActivaResponse> {
  const { data } = await apiClient.get<PracticaActivaResponse>("/practicas/active");
  return data;
}

/**
 * POST /practicas/{id}/confirmar: el docente confirma al último alumno
 * identificado y la práctica pasa a revisar su indumentaria (6 s).
 * 409 si ese alumno ya no es el identificado o la revisión ya está en curso.
 */
export async function confirmarIdentificacion(practicaId: string, alumnoId: string): Promise<void> {
  const payload: ConfirmarRequest = { alumno_id: alumnoId };
  await apiClient.post(`/practicas/${practicaId}/confirmar`, payload);
}

export async function finalizarPractica(practicaId: string): Promise<PracticaInDB> {
  const { data } = await apiClient.post<PracticaInDB>(`/practicas/${practicaId}/end`);
  return data;
}

/** GET /practicas/{id}/reporte (`materia_id` en la respuesta es PENDIENTE EN BACKEND). */
export async function obtenerReporte(practicaId: string): Promise<ReporteDetalle> {
  const { data } = await apiClient.get<ReporteDetalle>(`/practicas/${practicaId}/reporte`);
  return data;
}

const practicaDesdeReporte = (r: ReporteDetalle): PracticaDetalle => ({
  _id: r.practica_id,
  materia_id: r.materia_id ?? "",
  docente_id: "",
  fecha: r.fecha,
  hora_inicio: r.hora_inicio,
  hora_fin: r.hora_fin,
  estado: r.hora_fin ? "finalizada" : "activa",
  presentes: r.presentes,
  ausentes: r.ausentes,
  total_matriculados: r.total_matriculados,
});

/**
 * GET /practicas?materia_id=: prácticas dentro del alcance del usuario (docente:
 * sus materias; coordinador: su cargo; admin: todas), de la más reciente a la
 * más antigua. Incluye las que no tienen asistencias.
 */
export async function listarPracticas(materiaId?: string): Promise<PracticaDetalle[]> {
  const { data } = await apiClient.get<PracticaDetalle[]>("/practicas", {
    params: materiaId ? { materia_id: materiaId } : undefined,
  });
  return data;
}

/**
 * Una práctica por id. El backend no tiene GET /practicas/{id} (PENDIENTE): si
 * es la práctica en curso sale de /practicas/active; si no, del listado; y como
 * último recurso se arma con su reporte.
 */
export async function obtenerPractica(practicaId: string): Promise<PracticaDetalle> {
  const activa = await obtenerPracticaActiva().catch(() => null);
  if (activa?._id === practicaId) return activa;
  try {
    const { data } = await apiClient.get<PracticaDetalle>(`/practicas/${practicaId}`);
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || ![404, 405].includes(error.response?.status ?? 0)) throw error;
  }
  const listada = (await listarPracticas().catch(() => [])).find((p) => p._id === practicaId);
  return listada ?? practicaDesdeReporte(await obtenerReporte(practicaId));
}

/**
 * Prácticas de una materia con sus contadores de asistencia. El listado del
 * backend no los trae (PENDIENTE): se completan con el reporte de cada práctica.
 */
export async function listarPracticasMateria(materiaId: string): Promise<PracticaDetalle[]> {
  const practicas = await listarPracticas(materiaId);
  // allSettled: si falla el reporte de una práctica, sale sin contadores.
  const reportes = await Promise.allSettled(
    practicas.map((p) => (p.presentes === undefined ? obtenerReporte(p._id) : Promise.resolve(null))),
  );
  return practicas.map((p, i) => {
    const r = reportes[i];
    if (r.status !== "fulfilled" || !r.value) return p;
    const { presentes, ausentes, total_matriculados } = r.value;
    return { ...p, presentes, ausentes, total_matriculados };
  });
}

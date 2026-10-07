import axios from "axios";
import { apiClient } from "@/api/client";
import { listarAsistencias } from "@/api/asistencias";
import type { ConfirmarRequest, PracticaActivaResponse, PracticaInDB } from "@/types";
import type { PracticaDetalle, PracticaNueva, ReporteDetalle } from "@/types/portal";

// Sesiones de práctica (POST /practicas, ...). El catálogo de EPP por área
// vive en src/api/practices.ts.

/**
 * POST /practicas: enciende la cámara del servidor y arranca la detección.
 * Solo puede haber una práctica activa en todo el servidor (409 si ya hay otra).
 * `numero` y `tema` son PENDIENTE EN BACKEND (hoy solo usa materia_id).
 */
export async function iniciarPractica(payload: PracticaNueva): Promise<PracticaDetalle> {
  const { data } = await apiClient.post<PracticaDetalle>("/practicas", payload);
  return data;
}

/** GET /practicas/active: la práctica en curso del servidor, aunque sea de otro docente. */
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
 * Una práctica por id. El backend no tiene GET /practicas/{id} (PENDIENTE): si
 * es la práctica en curso sale de /practicas/active; si no, se arma con su reporte.
 */
export async function obtenerPractica(practicaId: string): Promise<PracticaDetalle> {
  const activa = await obtenerPracticaActiva().catch(() => null);
  if (activa?._id === practicaId) return activa;
  try {
    const { data } = await apiClient.get<PracticaDetalle>(`/practicas/${practicaId}`);
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || ![404, 405].includes(error.response?.status ?? 0)) throw error;
    return practicaDesdeReporte(await obtenerReporte(practicaId));
  }
}

/**
 * Prácticas de una materia, de la más reciente a la más antigua.
 * PENDIENTE EN BACKEND: GET /practicas?materia_id=. Mientras tanto se agrupan
 * las asistencias por practica_id y se pide el reporte de cada una, así que las
 * prácticas sin ninguna asistencia no aparecen (FRONTEND.md §11).
 */
export async function listarPracticasMateria(materiaId: string): Promise<PracticaDetalle[]> {
  try {
    const { data } = await apiClient.get<PracticaDetalle[]>("/practicas", {
      params: { materia_id: materiaId },
    });
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || ![404, 405].includes(error.response?.status ?? 0)) throw error;
  }

  const asistencias = await listarAsistencias({ materia_id: materiaId });
  const ids = [...new Set(asistencias.map((a) => a.practica_id))];
  // allSettled: si falla el reporte de una práctica, el resto igual se muestra.
  const reportes = await Promise.allSettled(ids.map(obtenerReporte));
  return reportes
    .flatMap((r) => (r.status === "fulfilled" ? [{ ...practicaDesdeReporte(r.value), materia_id: materiaId }] : []))
    .sort((a, b) => b.hora_inicio.localeCompare(a.hora_inicio));
}

import { apiClient } from "@/api/client";
import type { PracticaActivaResponse, PracticaInDB } from "@/types";
import type { PracticaDetalle, PracticaNueva, ReporteDetalle } from "@/types/portal";

// Sesiones de práctica (POST /practicas, ...). El catálogo de EPP por área
// vive en src/api/practices.ts.

/** POST /practicas. `numero` y `tema` son PENDIENTE EN BACKEND (hoy solo usa materia_id). */
export async function iniciarPractica(payload: PracticaNueva): Promise<PracticaDetalle> {
  const { data } = await apiClient.post<PracticaDetalle>("/practicas", payload);
  return data;
}

export async function obtenerPracticaActiva(): Promise<PracticaActivaResponse> {
  const { data } = await apiClient.get<PracticaActivaResponse>("/practicas/active");
  return data;
}

export async function finalizarPractica(practicaId: string): Promise<PracticaInDB> {
  const { data } = await apiClient.post<PracticaInDB>(`/practicas/${practicaId}/end`);
  return data;
}

/** PENDIENTE EN BACKEND: GET /api/v1/practicas/{practica_id} */
export async function obtenerPractica(practicaId: string): Promise<PracticaDetalle> {
  const { data } = await apiClient.get<PracticaDetalle>(`/practicas/${practicaId}`);
  return data;
}

/** PENDIENTE EN BACKEND: GET /api/v1/practicas?materia_id= -> más recientes primero. */
export async function listarPracticasMateria(materiaId: string): Promise<PracticaDetalle[]> {
  const { data } = await apiClient.get<PracticaDetalle[]>("/practicas", {
    params: { materia_id: materiaId },
  });
  return data;
}

/** GET /practicas/{id}/reporte (`materia_id` en la respuesta es PENDIENTE EN BACKEND). */
export async function obtenerReporte(practicaId: string): Promise<ReporteDetalle> {
  const { data } = await apiClient.get<ReporteDetalle>(`/practicas/${practicaId}/reporte`);
  return data;
}

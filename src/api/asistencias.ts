import { apiClient } from "@/api/client";
import type { AsistenciaInDB, ListarAsistenciasParams, ReportePractica } from "@/types";

export async function listarAsistencias(params?: ListarAsistenciasParams): Promise<AsistenciaInDB[]> {
  const { data } = await apiClient.get<AsistenciaInDB[]>("/asistencias", { params });
  return data;
}

export async function obtenerReportePractica(practicaId: string): Promise<ReportePractica> {
  const { data } = await apiClient.get<ReportePractica>(`/practicas/${practicaId}/reporte`);
  return data;
}
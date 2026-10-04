import { apiClient } from "@/api/client";
import type { AsistenciaInDB, ListarAsistenciasParams } from "@/types";

export async function listarAsistencias(
  params?: ListarAsistenciasParams,
): Promise<AsistenciaInDB[]> {
  const { data } = await apiClient.get<AsistenciaInDB[]>("/asistencias", { params });
  return data;
}
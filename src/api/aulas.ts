import { apiClient } from "@/api/client";
import type { AulaCreate, AulaInDB } from "@/types";

export async function listarAulas(): Promise<AulaInDB[]> {
  const { data } = await apiClient.get<AulaInDB[]>("/aulas");
  return data;
}

export async function crearAula(payload: AulaCreate): Promise<AulaInDB> {
  const { data } = await apiClient.post<AulaInDB>("/aulas", payload);
  return data;
}

import { apiClient } from "@/api/client";
import type { HealthResponse } from "@/types";

export async function obtenerHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}
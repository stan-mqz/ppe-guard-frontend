import { apiClient } from "@/api/client";
import type { PracticeInDB } from "@/types";

export async function listarPracticas(): Promise<PracticeInDB[]> {
  const { data } = await apiClient.get<PracticeInDB[]>("/practices");
  return data;
}

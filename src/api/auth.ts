import { apiClient } from "@/api/client";
import type { TokenResponse, UsuarioLogin } from "@/types";

export async function login(credentials: UsuarioLogin): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", credentials);
  return data;
}

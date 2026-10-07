import { apiClient } from "@/api/client";
import { USE_MOCKS } from "@/api/config";
import { mockAdapter } from "@/mocks/server";

// Con VITE_USE_MOCKS=true todas las llamadas de src/api se responden con el
// backend simulado; sin la variable, apiClient sigue hablando con PPE_Guard.
if (USE_MOCKS) {
  apiClient.defaults.adapter = mockAdapter;
  console.info("[PPE Guard] Usando datos de demostración (VITE_USE_MOCKS=true)");
}

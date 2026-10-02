import { redirect } from "react-router-dom";
import { clearSession } from "@/auth/session";

export async function logoutAction() {
  clearSession();
  return redirect("/login");
}

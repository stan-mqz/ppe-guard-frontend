import { Form, redirect, useActionData, useNavigation, useSearchParams } from "react-router-dom";
import { login } from "@/api/auth";
import { saveSession } from "@/auth/session";
import { getApiErrorMessage } from "@/api/client";

/**
 * Action del data router: react-router invoca esto cuando el <Form method="post">
 * se envía, antes de volver a renderizar. No se usa useState/onSubmit a mano.
 */
export async function loginAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const codigo = String(formData.get("codigo") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/app");

  try {
    const { access_token, nombre } = await login({ codigo, password });
    saveSession(access_token, nombre);
    return redirect(from);
  } catch (error) {
    return { error: getApiErrorMessage(error, "Código o contraseña incorrectos") };
  }
}

export function LoginPage() {
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-brand p-16 text-white md:flex">
        <div>
          <p className="text-2xl font-bold">PPE GUARD</p>
          <p className="text-sm font-semibold tracking-wide text-accent">UNIVERSIDAD DE ORIENTE</p>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            Plataforma Operativa de Control y Acceso
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Acceso seguro a laboratorios, clínicas y talleres mediante verificación
            biométrica y detección automática de indumentaria requerida (EPP).
          </p>
        </div>
        <p className="text-sm text-white/50">
          Tecnología de Inteligencia Artificial para la seguridad institucional.
        </p>
      </div>

      <div className="flex w-full items-center justify-center p-8 md:w-1/2">
        <Form method="post" className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa tus credenciales institucionales de UNIVO
          </p>

          <input type="hidden" name="from" value={searchParams.get("from") ?? "/app"} />

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Código de Estudiante o Usuario
          </label>
          <input
            name="codigo"
            required
            placeholder="Ej. U20210452"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />

          <label className="mt-4 block text-sm font-semibold text-slate-700">Contraseña</label>
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />

          {actionData?.error && (
            <p className="mt-3 text-sm font-medium text-red-600">{actionData.error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {isSubmitting ? "Verificando..." : "Autenticar"}
          </button>
        </Form>
      </div>
    </div>
  );
}

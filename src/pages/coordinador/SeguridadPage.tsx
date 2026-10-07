import { useState, type FormEvent } from "react";
import { getApiErrorMessage } from "@/api/client";
import { cambiarPassword } from "@/api/usuariosGestion";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Input } from "@/components/Field";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { useToast } from "@/hooks/useToast";

const MINIMO = 8;

/** Mi Perfil de coordinación/administración: cambio de contraseña. */
export const SeguridadPage = () => {
  const { toast, setToast, cerrar } = useToast();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (!actual) encontrados.actual = "Ingrese su contraseña actual.";
    if (nueva.length < MINIMO) encontrados.nueva = `La nueva contraseña debe tener al menos ${MINIMO} caracteres.`;
    else if (nueva === actual) encontrados.nueva = "La nueva contraseña debe ser distinta de la actual.";
    if (confirmacion !== nueva) encontrados.confirmacion = "Las contraseñas no coinciden.";
    setErrores(encontrados);
    setErrorGuardar(null);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    try {
      await cambiarPassword(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmacion("");
      setToast("Su contraseña se actualizó correctamente.");
    } catch (err) {
      setErrorGuardar(getApiErrorMessage(err, "No se pudo actualizar la contraseña."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Topbar title="Configuración de Perfil - UNIVO" />

      <div className="p-8">
        <Card className="max-w-xl">
          <h2 className="mb-6 text-xl font-bold text-slate-800">Actualizar Seguridad y Acceso</h2>

          <form onSubmit={guardar} noValidate className="space-y-4">
            <Field label="Contraseña Actual" error={errores.actual}>
              <Input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
            </Field>
            <Field label="Nueva Contraseña" error={errores.nueva}>
              <Input
                type="password"
                autoComplete="new-password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                placeholder={`Mínimo ${MINIMO} caracteres`}
              />
            </Field>
            <Field label="Confirmar Contraseña" error={errores.confirmacion}>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder="Repita la contraseña"
              />
            </Field>

            {errorGuardar && <p role="alert" className="text-sm font-medium text-red-600">{errorGuardar}</p>}

            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar Cambios de Perfil"}
            </Button>
          </form>
        </Card>
      </div>

      <Toast message={toast} onClose={cerrar} />
    </>
  );
};

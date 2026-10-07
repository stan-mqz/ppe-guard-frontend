import { ScanFace } from "lucide-react";
import { obtenerMiPerfil } from "@/api/usuariosGestion";
import { ErrorState } from "@/components/AsyncState";
import { Card, Skeleton } from "@/components/Card";
import { ReadOnlyField } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";

export const PerfilBiometricoPage = () => {
  const { data: perfil, loading, error, reload } = useAsync(obtenerMiPerfil, [], "No se pudo cargar tu perfil");
  const conRostro = perfil?.rostro_registrado === true;

  return (
    <>
      <Topbar
        title="Perfil Biométrico"
        pill={
          perfil && !conRostro ? <StatusPill tone="danger">Biometría pendiente</StatusPill> : undefined
        }
      />

      <div className="max-w-4xl space-y-6 p-8">
        <Card>
          <h2 className="text-xl font-bold text-slate-800">Perfil del Estudiante</h2>
          <h3 className="mb-5 mt-4 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-600">
            Información Institucional
          </h3>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Nombres completos">{perfil!.nombre}</ReadOnlyField>
              <ReadOnlyField label="Código de estudiante">{perfil!.codigo}</ReadOnlyField>
              <ReadOnlyField label="Correo institucional">{perfil!.correo}</ReadOnlyField>
              <ReadOnlyField label="Carrera universitaria">{perfil!.carrera}</ReadOnlyField>
              <ReadOnlyField label="Facultad correspondiente">{perfil!.facultad}</ReadOnlyField>
              <ReadOnlyField label="Estatus académico">
                {perfil!.estatus && (
                  <StatusPill uppercase={false}>{perfil!.estatus}</StatusPill>
                )}
              </ReadOnlyField>
            </dl>
          )}
        </Card>

        {perfil && (
          <Card className="flex flex-wrap items-center gap-4">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                conRostro ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
            >
              <ScanFace className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800">Estado biométrico</h3>
              <p className="text-sm text-slate-500">
                {conRostro
                  ? "Tu rostro está registrado. El sistema puede validar tu acceso a laboratorios, clínicas y talleres."
                  : "Aún no tienes un rostro registrado. Acércate a tu coordinación para completar el enrolamiento."}
              </p>
            </div>
            <StatusPill tone={conRostro ? "success" : "danger"}>
              {conRostro ? "Rostro registrado" : "Sin rostro"}
            </StatusPill>
          </Card>
        )}
      </div>
    </>
  );
};

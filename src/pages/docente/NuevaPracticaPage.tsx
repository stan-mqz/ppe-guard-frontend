import { ArrowRight, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { USE_MOCKS } from "@/api/config";
import { listarMateriasDetalle, listarTemas } from "@/api/materiasDetalle";
import { iniciarPractica, obtenerPracticaActiva } from "@/api/practicas";
import { ErrorState } from "@/components/AsyncState";
import { Button, buttonClass } from "@/components/Button";
import { Card, Eyebrow, Skeleton } from "@/components/Card";
import { EppTags } from "@/components/EppTag";
import { Field, Select } from "@/components/Field";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import { useCamera } from "@/hooks/useCamera";
import { useSession } from "@/hooks/useSession";
import type { PracticaNueva } from "@/types/portal";
import { etiquetaSeccion } from "@/utils/materia";

// ---------------------------------------------------------------------------
// Paso 2: conexión de la cámara
// ---------------------------------------------------------------------------

// Con el backend real la cámara es la del servidor: POST /practicas la enciende
// y el navegador nunca pide getUserMedia (si la tomara, el servidor no podría
// abrirla). Solo la demo, que no tiene servidor de video, usa la del navegador.
const TEXTOS = USE_MOCKS
  ? {
      titulo: "Solicitando acceso a la cámara de la laptop",
      detalle: (
        <>
          El navegador le mostrará una ventana de permisos. Pulse <strong>“Permitir”</strong> para que el
          sistema InduDetect pueda verificar la indumentaria de los alumnos.
        </>
      ),
      pasos: [
        "Pulse “Permitir” en el aviso del navegador (junto a la barra de direcciones).",
        "Mantenga la cámara apuntando hacia la entrada del laboratorio.",
      ],
      espera: "Esperando confirmación de señal...",
      error: "No se obtuvo acceso a la cámara. Revise que no esté bloqueada en el navegador ni en uso por otra aplicación.",
    }
  : {
      titulo: "Conectando con la cámara IA del laboratorio",
      detalle: (
        <>
          El servidor de PPE Guard está encendiendo la cámara conectada al equipo del laboratorio. No
          necesita conceder permisos en el navegador.
        </>
      ),
      pasos: [
        "Verifique que la cámara esté conectada al equipo donde corre el servidor.",
        "Manténgala apuntando hacia la entrada del laboratorio.",
      ],
      espera: "Esperando confirmación de señal...",
      error: "No se pudo iniciar la práctica.",
    };

function PasoCamara({ practica, onVolver }: { practica: PracticaNueva; onVolver: () => void }) {
  const navigate = useNavigate();
  const { iniciar, detener } = useCamera();
  const [estado, setEstado] = useState<"conectando" | "iniciando" | "error">("conectando");
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);

  const conectar = async () => {
    const miTurno = ++turno.current;
    setError(null);
    setEstado("conectando");
    if (USE_MOCKS) {
      const concedida = await iniciar();
      if (miTurno !== turno.current) return;
      if (!concedida) return setEstado("error");
      // El permiso ya quedó concedido: la vista en vivo vuelve a abrir la cámara.
      detener();
    }
    setEstado("iniciando");
    try {
      const creada = await iniciarPractica(practica);
      navigate(`/app/practicas/${creada._id}/en-vivo`, { replace: true });
    } catch (e) {
      // 409: ya hay una práctica en curso · 500: el servidor no pudo abrir la cámara.
      setError(getApiErrorMessage(e, TEXTOS.error));
      setEstado("error");
    }
  };

  useEffect(() => {
    // En desarrollo StrictMode monta dos veces: se espera un instante para no
    // enviar dos POST /practicas (el segundo respondería 409).
    const id = setTimeout(() => void conectar(), 50);
    return () => {
      clearTimeout(id);
      turno.current++;
    };
    // Solo al entrar al paso; los reintentos van por el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="mx-auto max-w-xl space-y-5 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-brand-dark ring-8 ring-accent/20">
        <Camera className="h-9 w-9" aria-hidden="true" />
      </span>
      <Eyebrow>Paso 2 de 3 • Conexión de dispositivo</Eyebrow>
      <h2 className="text-xl font-bold text-slate-800">{TEXTOS.titulo}</h2>
      <p className="text-sm text-slate-500">{TEXTOS.detalle}</p>

      <ol className="space-y-3 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-700">
        {TEXTOS.pasos.map((texto, i) => (
          <li key={texto} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {i + 1}
            </span>
            {texto}
          </li>
        ))}
      </ol>

      {estado === "error" ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm font-medium text-red-600">
            {error ?? TEXTOS.error}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={onVolver}>
              Regresar
            </Button>
            <Button onClick={conectar}>Reintentar</Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          {estado === "conectando" ? TEXTOS.espera : "Iniciando la práctica..."}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Paso 1: materia y práctica
// ---------------------------------------------------------------------------

export const NuevaPracticaPage = () => {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [materiaId, setMateriaId] = useState(searchParams.get("materia") ?? "");
  const [numero, setNumero] = useState("");
  const [paso, setPaso] = useState<1 | 2>(1);

  const materias = useAsync(
    () => listarMateriasDetalle({ docente_id: session.payload.uid }),
    [session.payload.uid],
    "No se pudieron cargar sus materias",
  );
  const temas = useAsync(
    () => (materiaId ? listarTemas(materiaId) : Promise.resolve([])),
    [materiaId],
    "No se pudieron cargar las prácticas de esta materia",
  );
  // La práctica en curso de este docente, si la hay. Solo puede haber una en
  // todo el servidor: si la tiene otro docente aquí llega null y es el 409 de
  // POST /practicas (paso 2) el que lo avisa.
  const activa = useAsync(obtenerPracticaActiva, []);

  const materia = materias.data?.find((m) => m._id === materiaId);
  const tema = temas.data?.find((t) => String(t.numero) === numero);
  // El backend aún no tiene programa de prácticas por materia: si no hay temas
  // que elegir, la práctica se inicia solo con la materia.
  const sinTemas = !temas.loading && (Boolean(temas.error) || temas.data?.length === 0);
  const listo = Boolean(materia && (tema || sinTemas));

  return (
    <>
      <Topbar title="Configurar Nueva Práctica de Laboratorio" />

      <div className="space-y-6 p-8">
        {paso === 2 && materia && listo ? (
          <PasoCamara
            practica={{ materia_id: materia._id, numero: tema?.numero, tema: tema?.tema }}
            onVolver={() => setPaso(1)}
          />
        ) : (
          <Card className="mx-auto max-w-3xl space-y-6">
            <div className="space-y-2">
              <Eyebrow>Paso 1 de 3 • Preparación de entorno</Eyebrow>
              <h2 className="text-xl font-bold text-slate-800">
                Seleccione la Materia y Regule el EPP Obligatorio
              </h2>
              <p className="text-sm text-slate-500">
                Elija la materia y la práctica que impartirá. El sistema exigirá a cada alumno el equipo
                de protección personal configurado para esa materia.
              </p>
            </div>

            {activa.data && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Ya hay una práctica en curso. Finalícela antes de iniciar otra.
                </p>
                <Link to={`/app/practicas/${activa.data._id}/en-vivo`} className={buttonClass("accent")}>
                  Reanudar práctica
                </Link>
              </div>
            )}

            {materias.loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : materias.error ? (
              <ErrorState message={materias.error} onRetry={materias.reload} />
            ) : materias.data!.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No tiene materias asignadas para iniciar una práctica.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Materia Asignada" required>
                    <Select
                      value={materiaId}
                      onChange={(e) => {
                        setMateriaId(e.target.value);
                        setNumero("");
                      }}
                    >
                      <option value="">Seleccione una materia</option>
                      {materias.data!.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.codigo ? `${m.codigo} • ` : ""}
                          {m.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Práctica de Laboratorio" required={!sinTemas}>
                    <Select
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      disabled={!materia || temas.loading || sinTemas}
                    >
                      <option value="">
                        {!materia
                          ? "Primero seleccione la materia"
                          : temas.loading
                            ? "Cargando prácticas..."
                            : sinTemas
                              ? "Práctica de laboratorio (sin programa registrado)"
                              : "Seleccione la práctica"}
                      </option>
                      {materia &&
                        temas.data?.map((t) => (
                          <option key={t.numero} value={t.numero}>
                            Práctica #{t.numero}: {t.tema}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>

                {materia && (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      EPP obligatorio • {etiquetaSeccion(materia)} • {materia.aula}
                    </p>
                    <EppTags epp={materia.epp} />
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Se calibrará el sistema biométrico en el siguiente paso.
              </p>
              <div className="flex gap-3">
                <Link to="/app/clases" className={buttonClass("secondary")}>
                  Cancelar
                </Link>
                <Button onClick={() => setPaso(2)} disabled={!listo || Boolean(activa.data)}>
                  Continuar a Permisos
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

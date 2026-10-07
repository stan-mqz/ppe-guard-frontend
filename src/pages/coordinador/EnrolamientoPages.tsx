import clsx from "clsx";
import { AlertTriangle, Camera, CheckCircle2, Eye, Glasses, PersonStanding, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { enrolarAlumno, type ResultadoEnrolamiento } from "@/api/biometria";
import { getApiErrorMessage } from "@/api/client";
import { ErrorState } from "@/components/AsyncState";
import { Button, buttonClass } from "@/components/Button";
import { Card, Skeleton } from "@/components/Card";
import { EppTags } from "@/components/EppTag";
import { Field, Input } from "@/components/Field";
import { useCamera } from "@/hooks/useCamera";
import { useEnrolamiento } from "@/layouts/WizardLayout";

const BASE = "/app/alumnos/nuevo";
const PASSWORD_TEMPORAL = "UNIVO*2026";

// ---------------------------------------------------------------------------
// Paso 1: datos generales
// ---------------------------------------------------------------------------

export const EnrolamientoDatosPage = () => {
  const { datos, setDatos, materias, materiasLoading, materiasError, recargarMaterias, materiaInicial, salida } =
    useEnrolamiento();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [nombre, setNombre] = useState(datos?.nombre ?? "");
  const [codigo, setCodigo] = useState(datos?.codigo ?? "");
  const [password, setPassword] = useState(datos?.password ?? PASSWORD_TEMPORAL);
  const [materiasIds, setMateriasIds] = useState<string[]>(
    datos?.materiasIds ?? (materiaInicial ? [materiaInicial] : []),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});

  const seleccionadas = (materias ?? []).filter((m) => materiasIds.includes(m._id));
  const unicos = (valores: (string | undefined)[]) => [...new Set(valores.filter(Boolean))].join(" / ");

  const continuar = (e: FormEvent) => {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (nombre.trim().split(/\s+/).length < 2) encontrados.nombre = "Ingrese nombres y apellidos del alumno.";
    if (!/^U\d{8}$/i.test(codigo.trim())) encontrados.codigo = "El carnet tiene el formato U seguido de 8 dígitos (Ej. U20210452).";
    if (password.length < 8) encontrados.password = "La contraseña temporal debe tener al menos 8 caracteres.";
    if (seleccionadas.length === 0) encontrados.materias = "Seleccione al menos una materia.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setDatos({
      nombre: nombre.trim(),
      codigo: codigo.trim().toUpperCase(),
      password,
      materiasIds: seleccionadas.map((m) => m._id),
    });
    navigate(`${BASE}/instrucciones${search}`);
  };

  return (
    <form onSubmit={continuar} noValidate className="space-y-6">
      <p className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Atención:</strong> El registro biométrico facial se realiza UNA SOLA VEZ. Verifique los
          datos del alumno antes de continuar.
        </span>
      </p>

      <Card className="space-y-4">
        <Field label="Nombre Completo del Alumno" required error={errores.nombre}>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombres y apellidos" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código de Carnet" required error={errores.codigo}>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. U20210452" />
          </Field>
          <Field label="Contraseña Temporal" required error={errores.password}>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-slate-700">
            Materias a inscribir <span className="text-red-500">*</span>
          </legend>
          {materiasLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : materiasError ? (
            <ErrorState message={materiasError} onRetry={recargarMaterias} />
          ) : materias!.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No hay materias disponibles.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {materias!.map((m) => {
                const activa = materiasIds.includes(m._id);
                return (
                  <label
                    key={m._id}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                      activa ? "border-brand bg-brand/5" : "border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#0b3d63]"
                      checked={activa}
                      onChange={() =>
                        setMateriasIds((ids) => (activa ? ids.filter((id) => id !== m._id) : [...ids, m._id]))
                      }
                    />
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="block text-sm font-semibold text-slate-800">
                        {m.codigo && <span className="text-accent">{m.codigo} • </span>}
                        {m.nombre}
                      </span>
                      <span className="block text-xs text-slate-500">{m.facultad}</span>
                      <EppTags epp={m.epp} />
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {errores.materias && <p className="mt-1 text-xs font-medium text-red-600">{errores.materias}</p>}
        </fieldset>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Datos de Enlace Académico (No editables)
          </p>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Facultad</dt>
              <dd className="font-semibold text-slate-800">
                {unicos(seleccionadas.map((m) => m.facultad)) || "Se completa al seleccionar materias"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Docente Responsable</dt>
              <dd className="font-semibold text-slate-800">
                {unicos(seleccionadas.map((m) => m.docente_nombre)) || "Se completa al seleccionar materias"}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">Siguiente paso: Instrucciones de captura de cámara</p>
        <div className="flex gap-3">
          <Link to={salida} className={buttonClass("secondary")}>
            Cancelar
          </Link>
          <Button type="submit">Guardar y Continuar</Button>
        </div>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Paso 2: instrucciones
// ---------------------------------------------------------------------------

const INDICACIONES: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: Eye,
    titulo: "Mira directamente a la cámara",
    texto: "El rostro debe quedar de frente, centrado en el óvalo y a la altura de los ojos.",
  },
  {
    icon: PersonStanding,
    titulo: "Permanece completamente quieto",
    texto: "Evita moverte o hablar durante la captura para que la imagen no salga borrosa.",
  },
  {
    icon: Glasses,
    titulo: "Quítate los lentes / accesorios",
    texto: "Retira lentes, gorras, mascarillas o cualquier accesorio que cubra parte del rostro.",
  },
];

export const EnrolamientoInstruccionesPage = () => {
  const { search } = useLocation();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Paso 2: Indicaciones antes de la captura</h2>

      <div className="grid gap-4 md:grid-cols-3">
        {INDICACIONES.map(({ icon: Icon, titulo, texto }) => (
          <Card key={titulo} className="space-y-3 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-brand">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="font-bold text-slate-800">{titulo}</h3>
            <p className="text-sm text-slate-500">{texto}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Asegúrese de contar con buena iluminación
        </p>
        <div className="flex gap-3">
          <Link to={`${BASE}/datos${search}`} className={buttonClass("secondary")}>
            Regresar
          </Link>
          <Link to={`${BASE}/captura${search}`} className={buttonClass("primary")}>
            Iniciar Cámara
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Paso 3: captura
// ---------------------------------------------------------------------------

interface DetectorRostros {
  detect: (fuente: HTMLVideoElement) => Promise<unknown[]>;
}

/**
 * true/false si el navegador puede detectar rostros (API FaceDetector, hoy
 * solo en Chrome); null si no hay forma de saberlo desde el navegador.
 */
function useRostroDetectado(video: React.RefObject<HTMLVideoElement>, activo: boolean): boolean | null {
  const [rostro, setRostro] = useState<boolean | null>(null);

  useEffect(() => {
    const Detector = (window as { FaceDetector?: new () => DetectorRostros }).FaceDetector;
    if (!activo || !Detector) return setRostro(null);

    let detector: DetectorRostros;
    try {
      detector = new Detector();
    } catch {
      return setRostro(null);
    }
    const id = setInterval(async () => {
      if (!video.current?.videoWidth) return;
      try {
        setRostro((await detector.detect(video.current)).length > 0);
      } catch {
        setRostro(null);
        clearInterval(id);
      }
    }, 700);
    return () => clearInterval(id);
  }, [video, activo]);

  return rostro;
}

export const EnrolamientoCapturaPage = () => {
  const { datos, materias, salida } = useEnrolamiento();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { videoRef, estado, iniciar, detener, capturar } = useCamera();

  const [foto, setFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEnrolamiento | null>(null);

  useEffect(() => {
    void iniciar();
  }, [iniciar]);

  const camaraLista = estado === "activa" && !foto;
  const rostro = useRostroDetectado(videoRef, camaraLista);

  const capturarRostro = async () => {
    const imagen = capturar();
    if (!imagen || !datos) return;
    const primera = materias?.find((m) => m._id === datos.materiasIds[0]);

    setFoto(imagen);
    setEnviando(true);
    setError(null);
    // Se libera la cámara del navegador: el backend toma el rostro con la cámara IA del equipo.
    detener();
    try {
      setResultado(
        await enrolarAlumno(
          {
            codigo: datos.codigo,
            nombre: datos.nombre,
            password: datos.password,
            carrera: primera?.carrera ?? "",
            facultad: primera?.facultad ?? "",
          },
          datos.materiasIds,
        ),
      );
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudo registrar el rostro. Intente de nuevo."));
      setFoto(null);
      void iniciar();
    } finally {
      setEnviando(false);
    }
  };

  const alumno = resultado?.alumno;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Cámara de Enrolamiento</h2>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900">
            {foto ? (
              <img src={foto} alt="Rostro capturado" className="h-full w-full -scale-x-100 object-cover" />
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            )}

            {(camaraLista || foto) && (
              <div
                aria-hidden="true"
                className={clsx(
                  "pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-dashed",
                  rostro === false ? "border-white/60" : "border-emerald-400",
                )}
              />
            )}

            {camaraLista && rostro !== false && (
              <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase text-white">
                {rostro ? "Rostro reconocido" : "Cámara lista • centre el rostro"}
              </span>
            )}
            {camaraLista && rostro === false && (
              <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase text-white">
                Ubique el rostro dentro del óvalo
              </span>
            )}

            {estado === "solicitando" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                Solicitando acceso a la cámara...
              </p>
            )}
            {(estado === "denegada" || estado === "interrumpida") && !foto && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                <AlertTriangle className="h-8 w-8 text-rose-400" aria-hidden="true" />
                <p className="text-sm">
                  No se pudo acceder a la cámara. Permita el acceso en el navegador y verifique que no esté
                  en uso por otra aplicación.
                </p>
                <Button variant="accent" onClick={iniciar}>
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={capturarRostro}
            disabled={!camaraLista || rostro === false || enviando || Boolean(resultado)}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {enviando ? "Generando vector facial..." : "Capturar Rostro"}
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Estado del Enrolamiento</h2>

          {alumno ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 font-bold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ¡Vector Facial Generado con Éxito!
                </p>
                <p className="mt-1 text-sm text-emerald-700/90">
                  El rostro de {alumno.nombre} quedó vinculado al carnet {alumno.codigo}. Ya puede ser
                  identificado al ingresar a sus prácticas.
                </p>
              </div>
              <dl className="space-y-3 rounded-xl bg-slate-100 p-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">ID Único de Vector Facial</dt>
                  <dd className="break-all font-mono font-semibold text-slate-800">
                    {alumno.vector_id ?? alumno._id}
                  </dd>
                </div>
                {alumno.precision !== undefined && (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      Precisión del Reconocimiento
                    </dt>
                    <dd className="font-semibold text-emerald-600">
                      {alumno.precision}% ({alumno.precision >= 99 ? "Óptimo" : "Aceptable"})
                    </dd>
                  </div>
                )}
              </dl>
              {resultado.inscripcionesFallidas.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  El alumno quedó registrado, pero no se pudo inscribir en todas las materias:
                  <ul className="mt-1 list-disc pl-5">
                    {resultado.inscripcionesFallidas.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                {enviando ? "Procesando la captura..." : "En espera de la captura"}
              </p>
              <p className="mt-1">
                {datos?.nombre} • {datos?.codigo}
              </p>
              <p className="mt-2 text-slate-500">
                Centre el rostro del alumno en el óvalo y pulse “Capturar Rostro” para generar su vector
                facial.
              </p>
            </div>
          )}

          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        </Card>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        {resultado ? (
          <span />
        ) : (
          <Link to={`${BASE}/instrucciones${search}`} className={buttonClass("secondary")}>
            Regresar
          </Link>
        )}
        <Button
          variant="success"
          disabled={!resultado}
          onClick={() =>
            navigate(salida, { state: { toast: `Enrolamiento de ${alumno?.nombre} completado con éxito.` } })
          }
        >
          Finalizar Enrolamiento
        </Button>
      </div>
    </div>
  );
};

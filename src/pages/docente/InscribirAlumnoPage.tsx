import axios from "axios";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/api/client";
import { matricularAlumno } from "@/api/materias";
import { obtenerMateria } from "@/api/materiasDetalle";
import { buscarEnPadron } from "@/api/usuariosGestion";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { Topbar } from "@/components/Topbar";
import { useAsync } from "@/hooks/useAsync";
import type { UsuarioDetalle } from "@/types/portal";
import { iniciales } from "@/utils/format";

type Busqueda =
  | { estado: "inicial" }
  | { estado: "buscando" }
  | { estado: "sin-resultado"; mensaje: string }
  // El servidor no tiene buscador de alumnos: se inscribe directo por código.
  | { estado: "sin-padron"; codigo: string }
  | { estado: "encontrado"; alumno: UsuarioDetalle };

export const InscribirAlumnoPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const listaUrl = `/app/materias/${subjectId}`;

  const materia = useAsync(() => obtenerMateria(subjectId!), [subjectId], "No se pudo cargar la materia");
  const [codigo, setCodigo] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda>({ estado: "inicial" });
  const [inscribiendo, setInscribiendo] = useState(false);
  const [errorInscripcion, setErrorInscripcion] = useState<string | null>(null);

  const buscar = async (e: FormEvent) => {
    e.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;
    setErrorInscripcion(null);
    setBusqueda({ estado: "buscando" });
    try {
      setBusqueda({ estado: "encontrado", alumno: await buscarEnPadron(valor) });
    } catch (error) {
      // PENDIENTE EN BACKEND: GET /usuarios/padron/{codigo}. Hoy esa ruta cae en
      // GET /usuarios/{usuario_id} y responde 422 ("usuario_id inválido").
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 422 || status === 405) return setBusqueda({ estado: "sin-padron", codigo: valor });
      setBusqueda({
        estado: "sin-resultado",
        mensaje: getApiErrorMessage(error, "No se pudo consultar el padrón. Intente de nuevo."),
      });
    }
  };

  const inscribir = async (codigoAlumno: string) => {
    setInscribiendo(true);
    setErrorInscripcion(null);
    try {
      await matricularAlumno(subjectId!, { codigo: codigoAlumno });
      navigate(listaUrl);
    } catch (error) {
      setErrorInscripcion(getApiErrorMessage(error, "No se pudo inscribir al alumno."));
      setInscribiendo(false);
    }
  };

  const alumno = busqueda.estado === "encontrado" ? busqueda.alumno : null;
  const yaInscrito = Boolean(alumno && materia.data?.alumnos_ids.includes(alumno._id));

  return (
    <>
      <Topbar title={materia.data ? `Inscribir Alumno en ${materia.data.nombre}` : "Inscribir Alumno"} />

      <div className="max-w-4xl space-y-6 p-8">
        <BackLink to={listaUrl}>Volver a la lista de inscritos</BackLink>

        {materia.error && <p className="text-sm font-medium text-red-600">{materia.error}</p>}

        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Búsqueda en Padrón UNIVO</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ingrese el código correlativo de alumno para buscarlo en la base de datos institucional de
              UNIVO e inscribirlo en esta materia.
            </p>
          </div>

          <form onSubmit={buscar} className="flex flex-wrap gap-3">
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. U20221042"
              aria-label="Código de alumno"
              className="max-w-xs"
              autoFocus
            />
            <Button type="submit" disabled={!codigo.trim() || busqueda.estado === "buscando"}>
              {busqueda.estado === "buscando" ? "Buscando..." : "Buscar"}
            </Button>
          </form>

          {busqueda.estado !== "inicial" && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Resultado de la búsqueda:</p>

              {busqueda.estado === "buscando" && (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              )}

              {busqueda.estado === "sin-resultado" && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  {busqueda.mensaje}
                </p>
              )}

              {alumno && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-accent bg-white p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {iniciales(alumno.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800">{alumno.nombre}</p>
                    <p className="text-sm text-slate-500">
                      {[alumno.codigo, alumno.carrera, alumno.facultad].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <StatusPill tone={alumno.rostro_registrado ? "success" : "danger"}>
                    {alumno.rostro_registrado ? "Rostro registrado" : "Sin rostro"}
                  </StatusPill>
                  {yaInscrito ? (
                    <span className="text-sm font-semibold text-slate-500">Ya inscrito en esta materia</span>
                  ) : (
                    <Button onClick={() => inscribir(alumno.codigo)} disabled={inscribiendo || !materia.data}>
                      {inscribiendo ? "Inscribiendo..." : "Inscribir en Materia"}
                    </Button>
                  )}
                </div>
              )}

              {busqueda.estado === "sin-padron" && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-accent bg-white p-4">
                  <p className="min-w-0 flex-1 text-sm text-slate-600">
                    El servidor aún no permite consultar el padrón antes de inscribir. Puede inscribir
                    directamente el código <strong className="text-slate-800">{busqueda.codigo}</strong>; si no
                    existe o ya está matriculado, se le avisará.
                  </p>
                  <Button onClick={() => inscribir(busqueda.codigo)} disabled={inscribiendo}>
                    {inscribiendo ? "Inscribiendo..." : "Inscribir en Materia"}
                  </Button>
                </div>
              )}

              {errorInscripcion && <p className="text-sm font-medium text-red-600">{errorInscripcion}</p>}
            </div>
          )}
        </Card>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand p-6 text-white">
          <div className="max-w-xl">
            <h2 className="font-bold">¿El alumno no se encuentra registrado en el padrón biométrico?</h2>
            <p className="mt-1 text-sm text-white/70">
              Puede darlo de alta con el asistente de enrolamiento: se registran sus datos y se captura su
              rostro una sola vez para toda la carrera.
            </p>
          </div>
          <Link to={`/app/alumnos/nuevo/datos?materia=${subjectId}`} className={buttonClass("accent")}>
            Iniciar Wizard Biométrico
          </Link>
        </section>
      </div>
    </>
  );
};

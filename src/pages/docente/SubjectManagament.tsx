import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router-dom";
import { requireAuth } from "@/auth/guards";
import { getApiErrorMessage } from "@/api/client";
import { listarAsistencias } from "@/api/asistencias";
import { obtenerHealth } from "@/api/health";
import {
  darDeBajaAlumno,
  listarAlumnosMateria,
  matricularAlumno,
  obtenerMateriaDocente,
} from "@/api/materias";
import { listarPracticas } from "@/api/practices";
import { Header } from "@/components/Header";
import { parseFechaApi } from "@/utils/format";
import { listaEpp } from "@/utils/materia";
import type { AlumnoEnMateriaOut, AsistenciaInDB, MateriaInDB, PracticeInDB } from "@/types";

// ---------------------------------------------------------------------------
// Datos: loader y action
// ---------------------------------------------------------------------------

interface SubjectManagementData {
  materia: MateriaInDB;
  ppe: string[];
  /** null = el endpoint de alumnos falló (o aún no existe en el backend). */
  alumnos: AlumnoEnMateriaOut[] | null;
  /** Última asistencia registrada por alumno_id. */
  ultimaAsistencia: Record<string, AsistenciaInDB>;
  /** true si GET /health respondió correctamente. */
  sistemaActivo: boolean;
}

interface ActionResult {
  ok: boolean;
  intent: string;
  error?: string;
}

export const subjectManagementLoader = async (args: LoaderFunctionArgs) => {
  // Lanza redirect si no hay sesión o el rol no es docente.
  const { session } = requireAuth("docente")(args);
  const subjectId = args.params.subjectId!;

  const [materia, practicas, alumnos, asistencias, health] = await Promise.all([
    obtenerMateriaDocente(session.payload.uid, subjectId),
    // Lo secundario no debe tumbar la página: si falla, se muestra vacío.
    listarPracticas().catch(() => [] as PracticeInDB[]),
    listarAlumnosMateria(subjectId).catch(() => null),
    listarAsistencias({ materia_id: subjectId }).catch(() => [] as AsistenciaInDB[]),
    obtenerHealth().catch(() => null),
  ]);

  if (!materia) {
    throw new Response("Materia no encontrada", { status: 404 });
  }

  const ultimaAsistencia: Record<string, AsistenciaInDB> = {};
  for (const a of asistencias) {
    const prev = ultimaAsistencia[a.alumno_id];
    if (!prev || Date.parse(a.hora_identificacion) > Date.parse(prev.hora_identificacion)) {
      ultimaAsistencia[a.alumno_id] = a;
    }
  }

  const ppe = practicas.find((p) => p.area === materia.area)?.ppe_requerido ?? [];

  return {
    materia,
    ppe,
    alumnos,
    ultimaAsistencia,
    sistemaActivo: health !== null,
  } satisfies SubjectManagementData;
};

export const subjectManagementAction = async ({
  request,
  params,
}: ActionFunctionArgs): Promise<ActionResult> => {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const materiaId = params.subjectId!;

  try {
    if (intent === "matricular") {
      const codigo = String(formData.get("codigo") ?? "").trim();
      if (!codigo) return { ok: false, intent, error: "Ingresa el código del alumno." };
      await matricularAlumno(materiaId, { codigo });
      return { ok: true, intent };
    }

    if (intent === "dar-de-baja") {
      await darDeBajaAlumno(materiaId, String(formData.get("alumno_id")));
      return { ok: true, intent };
    }

    return { ok: false, intent, error: "Acción no reconocida." };
  } catch (error) {
    const fallback =
      intent === "matricular"
        ? "No se pudo matricular al alumno. Verifica el código."
        : "No se pudo dar de baja al alumno.";
    return { ok: false, intent, error: getApiErrorMessage(error, fallback) };
  }
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "18 Nov 2026" */
function formatFecha(iso: string): string {
  const d = parseFechaApi(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "08:15 AM" */
function formatHora(iso: string): string {
  return parseFechaApi(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** Minúsculas y sin tildes, para que "menjivar" encuentre "Menjívar". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Componentes pequeños
// ---------------------------------------------------------------------------

function HeaderStatus({ activo }: { activo: boolean }) {
  return (
    <>
      <span
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase ${
          activo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-emerald-500" : "bg-slate-400"}`}
        />
        {activo ? "Sistema activo (IA)" : "Sistema sin conexión"}
      </span>
      <span className="border-l border-slate-200 pl-4 text-xs font-semibold uppercase text-slate-500">
        Portal docente
      </span>
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/clases"
      className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
    >
      <span aria-hidden="true">←</span> Volver a mis materias
    </Link>
  );
}

function AsistenciaCell({ asistencia }: { asistencia?: AsistenciaInDB }) {
  if (!asistencia) {
    return <span className="text-slate-400">Sin registros</span>;
  }

  const fecha = formatFecha(asistencia.hora_identificacion);

  if (asistencia.cumplio_indumentaria) {
    return (
      <span className="text-slate-500">
        {fecha} • {formatHora(asistencia.hora_identificacion)} (Válido)
      </span>
    );
  }

  const faltantes = asistencia.faltantes.length > 0 ? listaEpp(asistencia.faltantes) : "EPP";
  return (
    <span className="text-red-500">
      {fecha} • Falta {faltantes}
    </span>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
        {children}
      </td>
    </tr>
  );
}

function AlumnoRow({
  alumno,
  asistencia,
}: {
  alumno: AlumnoEnMateriaOut;
  asistencia?: AsistenciaInDB;
}) {
  // Cada fila tiene su propio fetcher: dar de baja no navega ni bloquea la tabla.
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== "idle";

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-semibold text-slate-800">{alumno.nombre}</td>
      <td className="px-4 py-3 text-slate-500">{alumno.codigo}</td>
      <td className="px-4 py-3 text-slate-700">{alumno.carrera ?? "—"}</td>
      <td className="px-4 py-3">
        <AsistenciaCell asistencia={asistencia} />
      </td>
      <td className="px-4 py-3 text-right">
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!window.confirm(`¿Dar de baja a ${alumno.nombre} de esta materia?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="dar-de-baja" />
          <input type="hidden" name="alumno_id" value={alumno._id} />
          <button
            type="submit"
            disabled={busy}
            className="font-semibold text-red-500 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50"
          >
            {busy ? "Procesando..." : "Dar de baja"}
          </button>
        </fetcher.Form>
        {fetcher.data && !fetcher.data.ok && (
          <p className="mt-1 text-xs text-red-600">{fetcher.data.error}</p>
        )}
      </td>
    </tr>
  );
}

function AddAlumnoForm({ onDone }: { onDone: () => void }) {
  const fetcher = useFetcher<ActionResult>();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Al matricular con éxito se cierra el formulario; el loader se revalida solo
  // y la tabla y el contador se actualizan.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onDone();
  }, [fetcher.state, fetcher.data, onDone]);

  return (
    <fetcher.Form
      method="post"
      className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="intent" value="matricular" />
      <div className="min-w-[220px] flex-1">
        <label htmlFor="codigo" className="block text-xs font-semibold text-slate-600">
          Código del alumno
        </label>
        <input
          ref={inputRef}
          id="codigo"
          name="codigo"
          required
          placeholder="Ej. U20210452"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        {fetcher.data && !fetcher.data.ok && (
          <p className="mt-1 text-xs text-red-600">{fetcher.data.error}</p>
        )}
      </div>
      <div className="flex gap-2 pt-5">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Matriculando..." : "Matricular"}
        </button>
      </div>
    </fetcher.Form>
  );
}

// ---------------------------------------------------------------------------
// Error boundary de la ruta
// ---------------------------------------------------------------------------

export const SubjectManagementErrorBoundary = () => {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? String(error.data)
    : getApiErrorMessage(error, "No se pudo cargar la materia.");

  return (
    <>
      <Header title="Gestión de Alumnos Inscritos" />
      <div className="mx-auto w-[90%] space-y-4 py-6">
        <BackLink />
        <p className="font-medium text-red-600">{message}</p>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export const SubjectManagement = () => {
  const { materia, ppe, alumnos, ultimaAsistencia, sistemaActivo } =
    useLoaderData() as SubjectManagementData;
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const filtrados = useMemo(() => {
    if (!alumnos) return [];
    const q = normalizar(query.trim());
    if (!q) return alumnos;
    return alumnos.filter(
      (a) => normalizar(a.nombre).includes(q) || normalizar(a.codigo).includes(q),
    );
  }, [alumnos, query]);

  return (
    <>
      <Header
        title="Gestión de Alumnos Inscritos"
        rightContent={<HeaderStatus activo={sistemaActivo} />}
      />

      <div className="mx-auto w-[90%] space-y-6 py-6">
        <BackLink />

        {/* Resumen de la materia */}
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-yellow-600">{materia.carrera}</p>
            <h2 className="text-xl font-bold text-slate-800">{materia.nombre}</h2>
            <p className="text-sm text-slate-500">
              {materia.aula} | EPP requerido:{" "}
              {ppe.length > 0 ? listaEpp(ppe) : "Sin EPP definido"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase text-slate-500">
              Alumnos matriculados
            </p>
            <p className="text-2xl font-bold text-brand">{materia.alumnos_ids.length} Activos</p>
          </div>
        </section>

        {/* Buscador + botón de añadir */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno por nombre o código..."
            aria-label="Buscar alumno por nombre o código"
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="inscribir"
              className="rounded-lg border border-brand bg-white px-4 py-2.5 text-sm font-semibold text-brand hover:bg-slate-50"
            >
              Buscar en Padrón UNIVO
            </Link>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                + Añadir Alumno
              </button>
            )}
          </div>
        </div>

        {showAddForm && <AddAlumnoForm onDone={() => setShowAddForm(false)} />}

        {/* Tabla de alumnos */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Carrera</th>
                <th className="px-4 py-3">Asistencia EPP</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnos === null ? (
                <EmptyRow>
                  No se pudo cargar la lista de alumnos. Recarga la página o verifica que el
                  servidor esté disponible.
                </EmptyRow>
              ) : alumnos.length === 0 ? (
                <EmptyRow>
                  Aún no hay alumnos matriculados. Usa “Añadir Alumno” para inscribir al primero.
                </EmptyRow>
              ) : filtrados.length === 0 ? (
                <EmptyRow>Ningún alumno coincide con “{query}”.</EmptyRow>
              ) : (
                filtrados.map((alumno) => (
                  <AlumnoRow
                    key={alumno._id}
                    alumno={alumno}
                    asistencia={ultimaAsistencia[alumno._id]}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
// Backend simulado: un adapter de axios que responde las mismas rutas que
// PPE_Guard (/api/v1/*) con datos en memoria y un retraso de 300–600 ms.
// Los servicios de src/api no saben que existe: para usar la API real basta
// con no activar VITE_USE_MOCKS.
//
// Las rutas marcadas PENDIENTE no existen todavía en el backend real.

import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import { jwtDecode } from "jwt-decode";
import type { FilaAsistencia, JwtPayload, Rol } from "@/types";
import type {
  AsistenciaDetalle,
  MateriaDetalle,
  PracticaDetalle,
  ReporteDetalle,
  UsuarioDetalle,
} from "@/types/portal";
import {
  CATALOGO_EPP,
  FACULTADES,
  PASSWORD_DEMO,
  crearDb,
  temasDeMateria,
  type DbUsuario,
  type MockDb,
} from "@/mocks/data";

// --- Estado -----------------------------------------------------------------

// Se guarda en sessionStorage para que una recarga no pierda lo creado
// (p. ej. una práctica en vivo); al cerrar la pestaña vuelve a los datos semilla.
const STORAGE_KEY = "ppe_guard_mock_db_v1";

function cargarDb(): MockDb {
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY);
    if (guardado) return JSON.parse(guardado) as MockDb;
  } catch {
    // sessionStorage no disponible o JSON corrupto: se regenera
  }
  return crearDb();
}

const db = cargarDb();

function persistir() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // sin espacio o sin sessionStorage: el estado vive solo en memoria
  }
}

// --- Utilidades -------------------------------------------------------------

class HttpError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

interface Ctx {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: Record<string, unknown>;
  user: DbUsuario | null;
}

interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  handler: (ctx: Ctx) => unknown;
}

const routes: Route[] = [];

function on(method: string, path: string, handler: Route["handler"]) {
  const keys: string[] = [];
  const pattern = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key);
    return "([^/]+)";
  });
  routes.push({ method, regex: new RegExp(`^${pattern}$`), keys, handler });
}

let secuencia = Date.now();
const nuevoId = (prefijo: string) => `${prefijo}-${(secuencia++).toString(36)}`;

function crearToken(usuario: DbUsuario): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload: JwtPayload = {
    sub: usuario.codigo,
    uid: usuario._id,
    rol: usuario.rol,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
  };
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.mock`;
}

/** Igual que require_role en el backend: admin hereda coordinador y docente. */
function autorizar(ctx: Ctx, ...roles: Rol[]): DbUsuario {
  if (!ctx.user) throw new HttpError(401, "No autenticado");
  if (roles.length > 0 && ctx.user.rol !== "admin" && !roles.includes(ctx.user.rol)) {
    throw new HttpError(403, "No tienes permiso para realizar esta acción");
  }
  return ctx.user;
}

const texto = (valor: unknown) => String(valor ?? "").trim();

function buscarUsuario(id: string): DbUsuario {
  const usuario = db.usuarios.find((u) => u._id === id);
  if (!usuario) throw new HttpError(404, "El usuario indicado no existe");
  return usuario;
}

function buscarMateria(id: string): MateriaDetalle {
  const materia = db.materias.find((m) => m._id === id);
  if (!materia) throw new HttpError(404, "La materia indicada no existe");
  return materia;
}

function buscarPractica(id: string): PracticaDetalle {
  const practica = db.practicas.find((p) => p._id === id);
  if (!practica) throw new HttpError(404, "La práctica indicada no existe");
  return practica;
}

const eppDe = (materia: MateriaDetalle) =>
  materia.epp ?? CATALOGO_EPP.find((c) => c.area === materia.area)?.ppe_requerido ?? [];

const etiquetaMateria = (m: MateriaDetalle) => `${m.codigo ?? m.carrera} • ${m.nombre}`;

function materiaOut(materia: MateriaDetalle): MateriaDetalle {
  return {
    ...materia,
    docente_nombre: db.usuarios.find((u) => u._id === materia.docente_id)?.nombre,
  };
}

function asistenciasPorAlumno(): Map<string, AsistenciaDetalle[]> {
  const mapa = new Map<string, AsistenciaDetalle[]>();
  for (const a of db.asistencias) {
    const lista = mapa.get(a.alumno_id);
    if (lista) lista.push(a);
    else mapa.set(a.alumno_id, [a]);
  }
  return mapa;
}

function usuarioOut(usuario: DbUsuario, asistencias?: Map<string, AsistenciaDetalle[]>): UsuarioDetalle {
  const detalle: UsuarioDetalle & { password?: string } = { ...usuario };
  delete detalle.password; // nunca sale del "servidor"

  if (usuario.rol === "docente") {
    detalle.materias_asignadas = db.materias
      .filter((m) => m.docente_id === usuario._id)
      .map(etiquetaMateria);
  }
  if (usuario.rol === "coordinador") {
    detalle.materias_count = db.materias.filter((m) => m.coordinador_id === usuario._id).length;
  }
  if (usuario.rol === "alumno") {
    const propias = (asistencias ?? asistenciasPorAlumno()).get(usuario._id) ?? [];
    const ultima = propias.reduce<AsistenciaDetalle | null>(
      (max, a) => (!max || a.hora_identificacion > max.hora_identificacion ? a : max),
      null,
    );
    const materia = ultima && db.materias.find((m) => m._id === ultima.materia_id);
    detalle.ultima_validacion = ultima
      ? {
          fecha: ultima.hora_identificacion,
          cumplio: ultima.cumplio_indumentaria,
          faltantes: ultima.faltantes,
          detectado: (materia ? eppDe(materia) : []).filter((e) => !ultima.faltantes.includes(e)),
        }
      : null;
    detalle.asistencia_epp_pct =
      propias.length === 0
        ? null
        : Math.round((propias.filter((a) => a.cumplio_indumentaria).length / propias.length) * 100);
  }
  return detalle;
}

function exigirCodigoLibre(codigo: string, exceptoId?: string) {
  if (!codigo) throw new HttpError(422, "El código es obligatorio");
  const ocupado = db.usuarios.some(
    (u) => u.codigo.toLowerCase() === codigo.toLowerCase() && u._id !== exceptoId,
  );
  if (ocupado) throw new HttpError(409, "Ya existe un usuario con ese código");
}

// --- Práctica en vivo ---------------------------------------------------------

/**
 * Mientras una práctica está activa no hay cámara IA real: se simula que los
 * alumnos van llegando uno a uno. Los dos últimos de la lista no asisten y el
 * tercero llega sin la última prenda del EPP (en QO101: Roberto, sin gafas).
 */
function asistenciasSimuladas(practica: PracticaDetalle): AsistenciaDetalle[] {
  const materia = buscarMateria(practica.materia_id);
  const epp = eppDe(materia);
  const inicio = Date.parse(practica.hora_inicio);
  const transcurrido = (Date.now() - inicio) / 1000;
  const total = materia.alumnos_ids.length;

  return materia.alumnos_ids.flatMap((alumnoId, i) => {
    const llegada = 4 + i * 2.5;
    if (transcurrido < llegada || (total > 3 && i >= total - 2)) return [];
    const faltantes = i === 2 && epp.length > 0 ? [epp[epp.length - 1]] : [];
    return [
      {
        _id: `asi-${practica._id}-${alumnoId}`,
        practica_id: practica._id,
        materia_id: materia._id,
        alumno_id: alumnoId,
        hora_identificacion: new Date(inicio + llegada * 1000).toISOString(),
        cumplio_indumentaria: faltantes.length === 0,
        faltantes,
      },
    ];
  });
}

function asistenciasDe(practica: PracticaDetalle): AsistenciaDetalle[] {
  return practica.estado === "activa"
    ? asistenciasSimuladas(practica)
    : db.asistencias.filter((a) => a.practica_id === practica._id);
}

function practicaOut(practica: PracticaDetalle): PracticaDetalle {
  const total = buscarMateria(practica.materia_id).alumnos_ids.length;
  const presentes = asistenciasDe(practica).length;
  return { ...practica, presentes, ausentes: Math.max(0, total - presentes), total_matriculados: total };
}

function reporte(practica: PracticaDetalle): ReporteDetalle {
  const materia = buscarMateria(practica.materia_id);
  const asistencias = new Map(asistenciasDe(practica).map((a) => [a.alumno_id, a]));

  const detalle: FilaAsistencia[] = materia.alumnos_ids.flatMap((alumnoId) => {
    const alumno = db.usuarios.find((u) => u._id === alumnoId);
    if (!alumno) return [];
    const a = asistencias.get(alumnoId);
    return [
      {
        alumno_id: alumnoId,
        nombre: alumno.nombre,
        codigo: alumno.codigo,
        hora_identificacion: a?.hora_identificacion ?? null,
        presente: Boolean(a),
        cumplio_indumentaria: a ? a.cumplio_indumentaria : null,
        faltantes: a?.faltantes ?? [],
        evidencia_url: null,
      },
    ];
  });

  const presentes = detalle.filter((f) => f.presente).length;
  const cumplieron = detalle.filter((f) => f.cumplio_indumentaria).length;
  return {
    practica_id: practica._id,
    materia_id: materia._id,
    materia_nombre: materia.nombre,
    docente_nombre: db.usuarios.find((u) => u._id === practica.docente_id)?.nombre ?? "—",
    fecha: practica.fecha,
    hora_inicio: practica.hora_inicio,
    hora_fin: practica.hora_fin,
    total_matriculados: detalle.length,
    presentes,
    ausentes: detalle.length - presentes,
    cumplieron,
    no_cumplieron: presentes - cumplieron,
    detalle,
  };
}

// --- Rutas: sesión y catálogos ----------------------------------------------

on("POST", "/auth/login", ({ body }) => {
  const codigo = texto(body.codigo).toLowerCase();
  const usuario = db.usuarios.find((u) => u.codigo.toLowerCase() === codigo);
  if (!usuario || usuario.password !== body.password) {
    throw new HttpError(401, "Código o contraseña incorrectos");
  }
  if (usuario.activo === false) throw new HttpError(403, "Este usuario se encuentra desactivado");
  return {
    access_token: crearToken(usuario),
    token_type: "bearer",
    rol: usuario.rol,
    nombre: usuario.nombre,
  };
});

// PENDIENTE
on("POST", "/auth/cambiar-password", (ctx) => {
  const usuario = autorizar(ctx);
  if (usuario.password !== ctx.body.password_actual) {
    throw new HttpError(400, "La contraseña actual no es correcta");
  }
  if (texto(ctx.body.password_nueva).length < 8) {
    throw new HttpError(422, "La nueva contraseña debe tener al menos 8 caracteres");
  }
  usuario.password = texto(ctx.body.password_nueva);
  return { ok: true };
});

on("GET", "/health", () => ({ status: "ok", mongo: "mock" }));
on("GET", "/practices", () => CATALOGO_EPP);
// PENDIENTE
on("GET", "/catalogos/facultades", () => FACULTADES);

// PENDIENTE
on("GET", "/coordinacion/resumen", (ctx) => {
  autorizar(ctx, "coordinador");
  const docentes = db.usuarios.filter((u) => u.rol === "docente");
  return {
    materias: db.materias.length,
    materias_nuevas: 2,
    materias_lab_activo: Math.min(6, db.materias.length),
    docentes: docentes.length,
    docentes_activos_hoy: Math.round(docentes.filter((d) => d.activo !== false).length * 0.72),
    alumnos: db.usuarios.filter((u) => u.rol === "alumno").length,
  };
});

// --- Rutas: materias ----------------------------------------------------------

on("GET", "/materias", (ctx) => {
  const usuario = autorizar(ctx);
  // PENDIENTE: el backend aún no deja al alumno listar sus materias.
  const alumnoId = usuario.rol === "alumno" ? usuario._id : ctx.query.alumno_id;
  const docenteId = usuario.rol === "docente" ? usuario._id : ctx.query.docente_id;
  return db.materias
    .filter((m) => !docenteId || m.docente_id === docenteId)
    .filter((m) => !alumnoId || m.alumnos_ids.includes(alumnoId))
    .map(materiaOut);
});

function datosMateria(body: Ctx["body"], base?: MateriaDetalle): Omit<MateriaDetalle, "_id" | "coordinador_id" | "alumnos_ids"> {
  const campo = (clave: keyof MateriaDetalle) => texto(body[clave] ?? base?.[clave]);
  const datos = {
    nombre: campo("nombre"),
    codigo: campo("codigo").toUpperCase(),
    seccion: campo("seccion").toUpperCase(),
    area: (campo("area") || "civil") as MateriaDetalle["area"],
    carrera: campo("carrera"),
    facultad: campo("facultad"),
    aula: campo("aula"),
    docente_id: campo("docente_id"),
    epp: (Array.isArray(body.epp) ? body.epp : (base?.epp ?? [])).map(String),
  };
  if (!datos.nombre || !datos.facultad || !datos.carrera || !datos.aula) {
    throw new HttpError(422, "Faltan datos obligatorios de la materia");
  }
  if (datos.docente_id) buscarUsuario(datos.docente_id);
  const duplicada = db.materias.some(
    (m) => m._id !== base?._id && m.codigo === datos.codigo && m.seccion === datos.seccion,
  );
  if (datos.codigo && duplicada) {
    throw new HttpError(409, `Ya existe la materia ${datos.codigo} sección ${datos.seccion}`);
  }
  return datos;
}

on("POST", "/materias", (ctx) => {
  const usuario = autorizar(ctx, "coordinador");
  const materia: MateriaDetalle = {
    ...datosMateria(ctx.body),
    _id: nuevoId("mat"),
    coordinador_id: usuario._id,
    alumnos_ids: [],
  };
  db.materias.unshift(materia);
  return materiaOut(materia);
});

// PENDIENTE
on("GET", "/materias/:id", (ctx) => {
  const usuario = autorizar(ctx);
  const materia = buscarMateria(ctx.params.id);
  if (usuario.rol === "docente" && materia.docente_id !== usuario._id) {
    throw new HttpError(403, "No puedes ver una materia que no impartes");
  }
  return materiaOut(materia);
});

// PENDIENTE
on("PUT", "/materias/:id", (ctx) => {
  autorizar(ctx, "coordinador");
  const materia = buscarMateria(ctx.params.id);
  Object.assign(materia, datosMateria(ctx.body, materia));
  return materiaOut(materia);
});

// PENDIENTE
on("DELETE", "/materias/:id", (ctx) => {
  autorizar(ctx, "coordinador");
  const materia = buscarMateria(ctx.params.id);
  const practicas = new Set(db.practicas.filter((p) => p.materia_id === materia._id).map((p) => p._id));
  db.materias = db.materias.filter((m) => m._id !== materia._id);
  db.practicas = db.practicas.filter((p) => !practicas.has(p._id));
  db.asistencias = db.asistencias.filter((a) => !practicas.has(a.practica_id));
  return { ok: true };
});

// PENDIENTE
on("GET", "/materias/:id/temas", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  return temasDeMateria(buscarMateria(ctx.params.id));
});

on("GET", "/materias/:id/alumnos", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  const materia = buscarMateria(ctx.params.id);
  const asistencias = asistenciasPorAlumno();
  return materia.alumnos_ids.flatMap((id) => {
    const alumno = db.usuarios.find((u) => u._id === id);
    return alumno ? [usuarioOut(alumno, asistencias)] : [];
  });
});

on("POST", "/materias/:id/alumnos", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  const materia = buscarMateria(ctx.params.id);
  const codigo = texto(ctx.body.codigo).toLowerCase();
  const alumno = db.usuarios.find((u) => u.rol === "alumno" && u.codigo.toLowerCase() === codigo);
  if (!alumno) throw new HttpError(404, "No existe un alumno con ese código en el padrón");
  if (materia.alumnos_ids.includes(alumno._id)) {
    throw new HttpError(409, "El alumno ya está inscrito en esta materia");
  }
  materia.alumnos_ids.push(alumno._id);
  return materiaOut(materia);
});

on("DELETE", "/materias/:id/alumnos/:alumnoId", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  const materia = buscarMateria(ctx.params.id);
  materia.alumnos_ids = materia.alumnos_ids.filter((id) => id !== ctx.params.alumnoId);
  return materiaOut(materia);
});

// --- Rutas: usuarios ----------------------------------------------------------

// PENDIENTE
on("GET", "/usuarios/me", (ctx) => usuarioOut(autorizar(ctx)));

// PENDIENTE
on("GET", "/usuarios/padron/:codigo", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  const codigo = ctx.params.codigo.toLowerCase();
  const alumno = db.usuarios.find((u) => u.rol === "alumno" && u.codigo.toLowerCase() === codigo);
  if (!alumno) throw new HttpError(404, "No se encontró ningún alumno con ese código");
  return usuarioOut(alumno);
});

// PENDIENTE
on("GET", "/usuarios", (ctx) => {
  const usuario = autorizar(ctx, "coordinador");
  const rol = ctx.query.rol;
  if (rol === "coordinador" && usuario.rol !== "admin") {
    throw new HttpError(403, "Solo el administrador puede ver a los coordinadores");
  }
  const asistencias = asistenciasPorAlumno();
  return db.usuarios.filter((u) => !rol || u.rol === rol).map((u) => usuarioOut(u, asistencias));
});

// PENDIENTE
on("POST", "/usuarios/alumnos/importar", (ctx) => {
  autorizar(ctx, "coordinador");
  let importados = 0;
  let omitidos = 0;
  for (const linea of texto(ctx.body.contenido).split(/\r?\n/)) {
    const [codigo, nombre, carrera, facultad] = linea.split(/[,;]/).map((c) => c.trim());
    if (!codigo || /^(c[oó]digo|carnet)$/i.test(codigo)) continue;
    const repetido = db.usuarios.some((u) => u.codigo.toLowerCase() === codigo.toLowerCase());
    if (!nombre || repetido) {
      omitidos++;
      continue;
    }
    db.usuarios.push({
      _id: nuevoId("alu"),
      codigo,
      nombre,
      rol: "alumno",
      carrera: carrera || null,
      facultad: facultad || null,
      correo: `${codigo.toLowerCase()}@alumnos.univo.edu.sv`,
      activo: true,
      estatus: "Estudiante Activo Ciclo II-2026",
      rostro_registrado: false,
      password: PASSWORD_DEMO,
    });
    importados++;
  }
  return { importados, omitidos };
});

on("POST", "/usuarios/coordinadores", (ctx) => {
  autorizar(ctx, "admin");
  const codigo = texto(ctx.body.codigo);
  exigirCodigoLibre(codigo);
  const usuario: DbUsuario = {
    _id: nuevoId("coo"),
    codigo,
    nombre: texto(ctx.body.nombre),
    rol: "coordinador",
    activo: true,
    permisos: [],
    password: texto(ctx.body.password),
  };
  db.usuarios.push(usuario);
  return usuarioOut(usuario);
});

on("POST", "/usuarios/docentes", (ctx) => {
  autorizar(ctx, "coordinador");
  const codigo = texto(ctx.body.codigo);
  exigirCodigoLibre(codigo);
  const usuario: DbUsuario = {
    _id: nuevoId("doc"),
    codigo,
    nombre: texto(ctx.body.nombre),
    rol: "docente",
    facultad: texto(ctx.body.facultad),
    coordinador_id: texto(ctx.body.coordinador_id),
    activo: true,
    password: texto(ctx.body.password),
  };
  db.usuarios.push(usuario);
  return usuarioOut(usuario);
});

// En el backend real este POST captura el rostro con la cámara del servidor y
// guarda el embedding. vector_id y precision son PENDIENTE.
on("POST", "/usuarios/alumnos", (ctx) => {
  autorizar(ctx, "coordinador", "docente");
  const codigo = texto(ctx.body.codigo);
  exigirCodigoLibre(codigo);
  const usuario: DbUsuario = {
    _id: nuevoId("alu"),
    codigo,
    nombre: texto(ctx.body.nombre),
    rol: "alumno",
    carrera: texto(ctx.body.carrera),
    facultad: texto(ctx.body.facultad),
    correo: `${codigo.toLowerCase()}@alumnos.univo.edu.sv`,
    activo: true,
    estatus: "Estudiante Activo Ciclo II-2026",
    rostro_registrado: true,
    password: texto(ctx.body.password),
  };
  db.usuarios.push(usuario);
  const sufijo = Math.random().toString(16).slice(2, 10).toUpperCase();
  return { ...usuarioOut(usuario), vector_id: `VF-${codigo}-${sufijo}`, precision: 99.98 };
});

// PENDIENTE
on("GET", "/usuarios/:id", (ctx) => {
  autorizar(ctx, "coordinador");
  return usuarioOut(buscarUsuario(ctx.params.id));
});

// PENDIENTE
on("PUT", "/usuarios/:id", (ctx) => {
  autorizar(ctx, "coordinador");
  const usuario = buscarUsuario(ctx.params.id);
  const { body } = ctx;
  if (body.codigo !== undefined) {
    exigirCodigoLibre(texto(body.codigo), usuario._id);
    usuario.codigo = texto(body.codigo);
  }
  for (const clave of ["nombre", "correo", "facultad", "departamento"] as const) {
    if (body[clave] !== undefined) usuario[clave] = texto(body[clave]);
  }
  if (texto(body.password)) usuario.password = texto(body.password);
  if (Array.isArray(body.permisos)) usuario.permisos = body.permisos.map(String);
  return usuarioOut(usuario);
});

// PENDIENTE
on("PATCH", "/usuarios/:id/estado", (ctx) => {
  autorizar(ctx, "coordinador");
  const usuario = buscarUsuario(ctx.params.id);
  usuario.activo = Boolean(ctx.body.activo);
  return usuarioOut(usuario);
});

// --- Rutas: prácticas y asistencias -------------------------------------------

on("POST", "/practicas", (ctx) => {
  const usuario = autorizar(ctx, "docente");
  if (db.practicas.some((p) => p.estado === "activa")) {
    throw new HttpError(409, "Ya hay una práctica en curso; finalízala antes de iniciar otra");
  }
  const materia = buscarMateria(texto(ctx.body.materia_id));
  if (usuario.rol === "docente" && materia.docente_id !== usuario._id) {
    throw new HttpError(403, "No puedes iniciar una práctica de una materia que no impartes");
  }
  const ahora = new Date().toISOString();
  const practica: PracticaDetalle = {
    _id: nuevoId("pra"),
    materia_id: materia._id,
    docente_id: materia.docente_id,
    fecha: ahora,
    hora_inicio: ahora,
    hora_fin: null,
    estado: "activa",
    // PENDIENTE: el backend real solo recibe materia_id.
    numero: Number(ctx.body.numero) || undefined,
    tema: texto(ctx.body.tema) || undefined,
  };
  db.practicas.push(practica);
  return practica;
});

on("GET", "/practicas/active", (ctx) => {
  autorizar(ctx, "docente");
  return db.practicas.find((p) => p.estado === "activa") ?? null;
});

// PENDIENTE
on("GET", "/practicas", (ctx) => {
  const usuario = autorizar(ctx, "docente", "coordinador");
  const { materia_id } = ctx.query;
  const propias = new Set(
    db.materias.filter((m) => usuario.rol !== "docente" || m.docente_id === usuario._id).map((m) => m._id),
  );
  return db.practicas
    .filter((p) => propias.has(p.materia_id) && (!materia_id || p.materia_id === materia_id))
    .sort((a, b) => Date.parse(b.hora_inicio) - Date.parse(a.hora_inicio))
    .map(practicaOut);
});

on("GET", "/practicas/:id/reporte", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  return reporte(buscarPractica(ctx.params.id));
});

on("POST", "/practicas/:id/end", (ctx) => {
  autorizar(ctx, "docente");
  const practica = buscarPractica(ctx.params.id);
  if (practica.estado === "finalizada") throw new HttpError(409, "Esta práctica ya fue finalizada");
  db.asistencias.push(...asistenciasSimuladas(practica));
  practica.estado = "finalizada";
  practica.hora_fin = new Date().toISOString();
  return practica;
});

// PENDIENTE
on("GET", "/practicas/:id", (ctx) => {
  autorizar(ctx, "docente", "coordinador");
  return practicaOut(buscarPractica(ctx.params.id));
});

on("GET", "/asistencias", (ctx) => {
  const usuario = autorizar(ctx);
  const { materia_id, docente_id } = ctx.query;
  let lista: AsistenciaDetalle[];
  if (usuario.rol === "alumno") {
    lista = db.asistencias.filter((a) => a.alumno_id === usuario._id);
  } else {
    const docente = usuario.rol === "docente" ? usuario._id : docente_id;
    const materias = new Set(
      db.materias
        .filter((m) => (!docente || m.docente_id === docente) && (!materia_id || m._id === materia_id))
        .map((m) => m._id),
    );
    lista = db.asistencias.filter((a) => a.materia_id && materias.has(a.materia_id));
  }
  return [...lista].sort((a, b) => Date.parse(b.hora_identificacion) - Date.parse(a.hora_identificacion));
});

// --- Adapter --------------------------------------------------------------------

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));

  const method = (config.method ?? "get").toUpperCase();
  const path = (config.url ?? "").split("?")[0].replace(/\/+$/, "");

  let user: DbUsuario | null = null;
  const auth = String(config.headers?.Authorization ?? "");
  if (auth.startsWith("Bearer ")) {
    try {
      const { uid, exp } = jwtDecode<JwtPayload>(auth.slice(7));
      if (exp * 1000 > Date.now()) user = db.usuarios.find((u) => u._id === uid) ?? null;
    } catch {
      // token ilegible: se trata como no autenticado
    }
  }

  const query: Ctx["query"] = {};
  for (const [clave, valor] of Object.entries(config.params ?? {})) {
    if (valor !== null && valor !== undefined) query[clave] = String(valor);
  }

  let status = 200;
  let data: unknown;
  try {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
    let encontrada = false;
    for (const route of routes) {
      const match = route.method === method ? route.regex.exec(path) : null;
      if (!match) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      data = route.handler({ params, query, body, user });
      encontrada = true;
      break;
    }
    if (!encontrada) throw new HttpError(404, `Ruta no simulada: ${method} ${path}`);
    if (method !== "GET") persistir();
    // Copia profunda: nada de lo que reciba la UI apunta al estado interno.
    data = data === undefined ? null : JSON.parse(JSON.stringify(data));
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    status = error.status;
    data = { detail: error.detail };
  }

  const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  }
  return response;
};

// Reflejan 1:1 el OpenAPI de PPE_Guard v0.1.0 (/api/v1/*)

export type Rol = "admin" | "coordinador" | "docente" | "alumno";
export type Area = "civil" | "medicina";
export type EstadoPractica = "activa" | "finalizada";

// Los datetime llegan como string ISO 8601 en UTC pero SIN zona horaria
// ("2026-10-06T14:02:11.532000"): hay que leerlos con parseFechaApi (utils/format).
export type ISODateTime = string;

// --- Health (GET /health) ---

export interface HealthResponse {
  status: string;
  mongo: string;
}

// --- Auth (POST /auth/login) ---

export interface UsuarioLogin {
  codigo: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string; // default "bearer"
  rol: Rol; // el backend lo tipa como string
  nombre: string;
}

// Payload decodificado del JWT (sub=codigo, uid=user_id, rol, exp)
export interface JwtPayload {
  sub: string;
  uid: string;
  rol: Rol;
  exp: number;
}

// --- Usuarios (POST /usuarios/coordinadores | docentes | alumnos, GET /usuarios/{id}) ---

export interface UsuarioOut {
  _id: string;
  codigo: string;
  nombre: string;
  rol: Rol; // el backend lo tipa como string
  carrera?: string | null;
  facultad?: string | null;
  coordinador_id?: string | null;
}

// GET /materias/{materia_id}/alumnos
export interface AlumnoEnMateriaOut {
  _id: string;
  codigo: string;
  nombre: string;
  carrera?: string | null;
  facultad?: string | null;
}

export interface CoordinadorCreate {
  codigo: string;
  password: string;
  nombre: string;
}

export interface DocenteCreate {
  codigo: string;
  password: string;
  nombre: string;
  facultad: string;
  coordinador_id: string;
}

export interface AlumnoCreate {
  codigo: string;
  password: string;
  nombre: string;
  carrera: string;
  facultad: string;
}

// --- Materias (POST/GET /materias, GET/PATCH /materias/{id}, .../alumnos) ---

export interface MateriaCreate {
  nombre: string;
  area: Area;
  carrera: string;
  facultad: string;
  aula: string;
  docente_id: string;
  // coordinador_id lo asigna el backend, no se envía
}

export interface MateriaInDB extends MateriaCreate {
  _id: string;
  coordinador_id: string;
  alumnos_ids: string[]; // default []
}

// PATCH /materias/{materia_id}: area y docente_id no se pueden cambiar
export interface MateriaUpdate {
  nombre?: string;
  carrera?: string;
  facultad?: string;
  aula?: string;
}

export interface AlumnoEnrollRequest {
  codigo: string;
}

// Query params de GET /materias
export interface ListarMateriasParams {
  docente_id?: string | null;
}

// --- Practices: catálogo (GET /practices) ---

export interface PracticeInDB {
  _id: string;
  area: string;
  nombre: string;
  ppe_requerido: string[];
  created_at?: ISODateTime;
}

// --- Prácticas (POST /practicas, GET /practicas/active,
//     POST /practicas/{id}/confirmar, POST /practicas/{id}/end) ---

export interface PracticaCreate {
  materia_id: string;
}

export interface PracticaInDB {
  _id: string;
  materia_id: string;
  docente_id: string;
  fecha: ISODateTime;
  hora_inicio: ISODateTime;
  hora_fin: ISODateTime | null;
  estado: EstadoPractica; // default "activa"
}

// GET /practicas/active devuelve null si no hay práctica activa
export type PracticaActivaResponse = PracticaInDB | null;

export interface ConfirmarRequest {
  alumno_id: string;
}

// --- Asistencias (GET /asistencias) ---

export interface AsistenciaInDB {
  _id: string;
  practica_id: string;
  alumno_id: string;
  hora_identificacion: ISODateTime;
  cumplio_indumentaria: boolean;
  faltantes: string[]; // default []
  evidencia_url?: string | null;
}

// Query params de GET /asistencias
export interface ListarAsistenciasParams {
  materia_id?: string | null;
  docente_id?: string | null;
  fecha_desde?: ISODateTime | null;
  fecha_hasta?: ISODateTime | null;
}

// --- Reporte (GET /practicas/{practica_id}/reporte) ---

export interface FilaAsistencia {
  alumno_id: string;
  nombre: string;
  codigo: string;
  hora_identificacion: ISODateTime | null;
  presente: boolean;
  cumplio_indumentaria: boolean | null;
  faltantes: string[];
  evidencia_url: string | null;
}

export interface ReportePractica {
  practica_id: string;
  materia_nombre: string;
  docente_nombre: string;
  fecha: ISODateTime;
  hora_inicio: ISODateTime;
  hora_fin: ISODateTime | null;
  total_matriculados: number;
  presentes: number;
  ausentes: number;
  cumplieron: number;
  no_cumplieron: number;
  detalle: FilaAsistencia[];
}

// --- Eventos en vivo (WebSocket /ws/detections; ver FRONTEND.md §7) ---

export interface DeteccionItem {
  class_name: string; // "Person", "Hardhat", "NO-Hardhat", "Safety Vest", ...
  confidence: number;
  track_id: number | null;
  bbox_norm: [number, number, number, number]; // [x1, y1, x2, y2] normalizado 0–1
  is_violation: boolean;
}

export type FasePractica = "identificacion" | "indumentaria";

export type WsEvent =
  | {
      evento: "estudiante_identificado";
      practica_id: string;
      alumno_id: string;
      nombre: string;
      codigo: string;
      confianza: number; // similitud facial, de 0.60 a 1
      timestamp: string;
    }
  | {
      evento: "fase_cambiada";
      practica_id: string;
      fase: FasePractica;
      alumno_id?: string; // solo cuando fase === "indumentaria"
      timestamp: string;
    }
  | {
      evento: "detecciones_frame"; // este evento NO trae practica_id
      frame_width: number;
      frame_height: number;
      items: DeteccionItem[];
      timestamp: string;
    }
  | {
      evento: "asistencia_registrada";
      practica_id: string;
      alumno_id: string;
      cumplio_indumentaria: boolean;
      faltantes: string[];
      evidencia_url: string | null; // solo hay foto cuando no cumplió
      timestamp: string;
    };

// --- Errores de la API ---

// HTTPException de FastAPI
export interface ApiError {
  detail: string | ValidationError[];
}

// 422 Validation Error
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}
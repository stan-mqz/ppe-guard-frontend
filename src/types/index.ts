// Reflejan 1:1 el OpenAPI de PPE_Guard v0.1.0 (/api/v1/*)

export type Rol = "admin" | "coordinador" | "docente" | "alumno";
export type Area = "civil" | "medicina";
export type EstadoPractica = "activa" | "finalizada";

// Los datetime llegan como string ISO 8601
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

// --- Usuarios (POST /usuarios/coordinadores | docentes | alumnos) ---

export interface UsuarioOut {
  _id: string;
  codigo: string;
  nombre: string;
  rol: Rol; // el backend lo tipa como string
  carrera?: string | null;
  facultad?: string | null;
  coordinador_id?: string | null;
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

// --- Materias (POST/GET /materias, POST /materias/{materia_id}/alumnos) ---

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

// --- Violations / eventos en vivo (WebSocket, no documentado en el OpenAPI) ---

export interface ViolationInDB {
  _id: string;
  episode_id: string;
  session_id: string;
  track_id: number;
  faltantes: string[];
  inicio: string;
  fin: string | null;
  estado: "abierto" | "cerrado";
  evidencia_url: string | null;
}

export interface DeteccionItem {
  class_name: string;
  confidence: number;
  track_id: number | null;
  bbox_norm: [number, number, number, number];
  is_violation: boolean;
}

export type WsEvent =
  | {
      evento: "detecciones_frame";
      frame_width: number;
      frame_height: number;
      items: DeteccionItem[];
      timestamp: string;
    }
  | {
      evento: "incumplimiento_iniciado";
      episode_id: string;
      track_id: number;
      faltantes: string[];
      evidencia_url: string | null;
      timestamp: string;
    }
  | {
      evento: "incumplimiento_actualizado";
      episode_id: string;
      faltantes: string[];
      timestamp: string;
    }
  | {
      evento: "incumplimiento_resuelto";
      episode_id: string;
      timestamp: string;
    };

// --- Errores de la API ---

// HTTPException de FastAPI
export interface ApiError {
  detail: string;
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
// Reflejan 1:1 los modelos Pydantic de app/models/*.py

export type Rol = "admin" | "coordinador" | "docente" | "alumno";
export type Area = "civil" | "medicina";

// --- Auth (app/models/usuario.py) ---

export interface UsuarioLogin {
  codigo: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  rol: Rol;
  nombre: string;
}

// Payload decodificado del JWT (sub=codigo, uid=user_id, rol, exp)
export interface JwtPayload {
  sub: string;
  uid: string;
  rol: Rol;
  exp: number;
}

export interface UsuarioOut {
  _id: string;
  codigo: string;
  nombre: string;
  rol: Rol;
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

// --- Aulas (app/models/aula.py) ---

export interface AulaCreate {
  nombre: string;
  area: Area;
  docente_id: string;
}

export interface AulaInDB extends AulaCreate {
  _id: string;
  estudiantes_ids: string[];
}

// --- Estudiantes (app/models/estudiante.py) ---

export interface EstudianteOut {
  _id: string;
  codigo: string;
  nombre: string;
}

// --- Practices (app/models/practice.py) ---

export interface PracticeInDB {
  _id: string;
  area: Area;
  nombre: string;
  ppe_requerido: string[];
  created_at: string;
}

// --- Asistencias (app/models/asistencia.py) ---

export interface AsistenciaInDB {
  _id: string;
  aula_id: string;
  estudiante_id: string;
  fecha: string;
  hora_identificacion: string;
  cumplio_indumentaria: boolean;
  faltantes: string[];
  evidencia_url: string | null;
}

// --- Violations / eventos en vivo (app/models/violation.py + websockets) ---

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

// --- Errores de la API (detalle de HTTPException de FastAPI) ---

export interface ApiError {
  detail: string;
}

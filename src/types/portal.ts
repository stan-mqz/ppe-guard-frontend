// Extensiones de los tipos del OpenAPI (src/types/index.ts) que usan las
// pantallas nuevas. Todo lo opcional es PENDIENTE EN BACKEND: la capa mock
// (src/mocks) ya lo devuelve; contra el backend real llega undefined y la UI
// cae a un valor por defecto.

import type {
  AsistenciaInDB,
  MateriaCreate,
  MateriaInDB,
  PracticaInDB,
  ReportePractica,
  UsuarioOut,
} from "@/types";

export interface MateriaDetalle extends MateriaInDB {
  codigo?: string;
  seccion?: string;
  /** EPP propio de la materia; si falta se usa el catálogo por área (GET /practices). */
  epp?: string[];
  docente_nombre?: string;
}

/** Materia con el EPP ya resuelto (propio o del catálogo por área). */
export interface MateriaVista extends MateriaDetalle {
  epp: string[];
}

export interface MateriaPayload extends MateriaCreate {
  codigo: string;
  seccion: string;
  epp: string[];
}

export interface UltimaValidacion {
  fecha: string;
  cumplio: boolean;
  detectado: string[];
  faltantes: string[];
}

export interface UsuarioDetalle extends UsuarioOut {
  correo?: string | null;
  departamento?: string | null;
  activo?: boolean;
  estatus?: string | null;
  rostro_registrado?: boolean;
  /** Docentes: "QO101 • Química Orgánica I". */
  materias_asignadas?: string[];
  /** Coordinadores: materias bajo su acceso. */
  materias_count?: number;
  permisos?: string[];
  /** Alumnos: última validación de la IA y % de asistencias con EPP completo. */
  ultima_validacion?: UltimaValidacion | null;
  asistencia_epp_pct?: number | null;
  /** Solo en la respuesta del enrolamiento. */
  vector_id?: string;
  precision?: number;
}

export interface UsuarioUpdate {
  nombre?: string;
  codigo?: string;
  correo?: string;
  facultad?: string;
  departamento?: string;
  password?: string;
  permisos?: string[];
}

export interface PracticaDetalle extends PracticaInDB {
  numero?: number;
  tema?: string;
  presentes?: number;
  ausentes?: number;
  total_matriculados?: number;
}

export interface PracticaNueva {
  materia_id: string;
  numero?: number;
  tema?: string;
}

export interface TemaPractica {
  numero: number;
  tema: string;
}

export interface AsistenciaDetalle extends AsistenciaInDB {
  materia_id?: string;
}

export interface ReporteDetalle extends ReportePractica {
  materia_id?: string;
}

export interface Facultad {
  nombre: string;
  carreras: string[];
}

export interface ResumenCoordinacion {
  materias: number;
  materias_nuevas: number;
  materias_lab_activo: number;
  docentes: number;
  docentes_activos_hoy: number;
  alumnos: number;
}

export interface ImportacionAlumnos {
  importados: number;
  omitidos: number;
}

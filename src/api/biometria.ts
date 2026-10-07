import { getApiErrorMessage } from "@/api/client";
import { matricularAlumno } from "@/api/materias";
import { crearAlumno } from "@/api/usuarios";
import type { AlumnoCreate } from "@/types";
import type { UsuarioDetalle } from "@/types/portal";

export interface ResultadoEnrolamiento {
  alumno: UsuarioDetalle;
  /** Materias donde no se pudo inscribir al alumno (el registro facial sí quedó hecho). */
  inscripcionesFallidas: string[];
}

/**
 * Enrolamiento completo: POST /usuarios/alumnos (el backend captura el rostro
 * con la cámara IA y guarda el vector facial) y luego inscribe al alumno en
 * cada materia seleccionada.
 */
export async function enrolarAlumno(datos: AlumnoCreate, materiasIds: string[]): Promise<ResultadoEnrolamiento> {
  const alumno: UsuarioDetalle = await crearAlumno(datos);

  const inscripcionesFallidas: string[] = [];
  for (const materiaId of materiasIds) {
    try {
      await matricularAlumno(materiaId, { codigo: datos.codigo });
    } catch (error) {
      inscripcionesFallidas.push(getApiErrorMessage(error, "No se pudo inscribir en una materia"));
    }
  }
  return { alumno, inscripcionesFallidas };
}

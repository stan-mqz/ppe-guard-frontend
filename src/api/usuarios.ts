import { apiClient } from "@/api/client";
import type {
  AlumnoCreate,
  CoordinadorCreate,
  DocenteCreate,
  EstudianteOut,
  UsuarioOut,
} from "@/types";

export async function listarEstudiantes(): Promise<EstudianteOut[]> {
  const { data } = await apiClient.get<EstudianteOut[]>("/estudiantes");
  return data;
}

export async function crearCoordinador(payload: CoordinadorCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/coordinadores", payload);
  return data;
}

export async function crearDocente(payload: DocenteCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/docentes", payload);
  return data;
}

export async function crearAlumno(payload: AlumnoCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/alumnos", payload);
  return data;
}

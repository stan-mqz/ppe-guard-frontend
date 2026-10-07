import type { MateriaDetalle } from "@/types/portal";

export const EPP_OPCIONES = ["Bata de Lab", "Gafas Prot.", "Botas Seg.", "Casco", "Chaleco", "Bata de Clínica"];

/** "QO101 • Sección A" (o la carrera, mientras el backend no envíe código y sección). */
export function etiquetaSeccion(materia: MateriaDetalle): string {
  return materia.codigo ? `${materia.codigo} • Sección ${materia.seccion ?? "—"}` : materia.carrera;
}

/** Prendas del EPP requerido que sí se detectaron, dado lo que faltó. */
export function eppDetectado(epp: string[], faltantes: string[]): string[] {
  return epp.filter((e) => !faltantes.includes(e));
}

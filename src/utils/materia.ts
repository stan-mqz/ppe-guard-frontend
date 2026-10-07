import type { MateriaDetalle } from "@/types/portal";

export const EPP_OPCIONES = ["Bata de Lab", "Gafas Prot.", "Botas Seg.", "Casco", "Chaleco", "Bata de Clínica"];

// El backend usa las clases del modelo YOLO (en inglés) en ppe_requerido y faltantes.
const EPP_LABEL: Record<string, string> = {
  Hardhat: "Casco",
  "Safety Vest": "Chaleco",
  Mask: "Mascarilla",
  Gloves: "Guantes",
  Gorro: "Gorro",
};

/** Nombre en español de una prenda ("Hardhat" -> "Casco"). */
export const etiquetaEpp = (prenda: string) => EPP_LABEL[prenda] ?? prenda;

/** "Casco, Chaleco" */
export const listaEpp = (prendas: string[]) => prendas.map(etiquetaEpp).join(", ");

/** "QO101 • Sección A" (o la carrera, mientras el backend no envíe código y sección). */
export function etiquetaSeccion(materia: MateriaDetalle): string {
  return materia.codigo ? `${materia.codigo} • Sección ${materia.seccion ?? "—"}` : materia.carrera;
}

/** Prendas del EPP requerido que sí se detectaron, dado lo que faltó. */
export function eppDetectado(epp: string[], faltantes: string[]): string[] {
  return epp.filter((e) => !faltantes.includes(e));
}

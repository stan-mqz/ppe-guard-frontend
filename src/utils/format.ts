const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const dos = (n: number) => String(n).padStart(2, "0");

/**
 * Las fechas REST llegan en UTC pero sin zona ("2026-10-06T14:02:11.532000");
 * new Date() las tomaría como hora local. Las del WebSocket ya traen +00:00.
 */
export function parseFechaApi(valor: string): Date {
  const tieneZona = /(Z|[+-]\d{2}:\d{2})$/.test(valor);
  return new Date(tieneZona ? valor : `${valor}Z`);
}

/** Milisegundos de una fecha de la API, para ordenar o comparar. */
export const msFechaApi = (valor: string) => parseFechaApi(valor).getTime();

/** "18 Nov 2026" */
export function formatFecha(iso: string): string {
  const d = parseFechaApi(iso);
  return `${dos(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "18 Nov" */
export function formatDiaMes(iso: string): string {
  const d = parseFechaApi(iso);
  return `${dos(d.getDate())} ${MESES[d.getMonth()]}`;
}

/** "08:15 AM" */
export function formatHora(iso: string): string {
  return parseFechaApi(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** "18 Nov 2026 • 08:00" */
export function formatFechaHora(iso: string): string {
  const d = parseFechaApi(iso);
  return `${formatFecha(iso)} • ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Minúsculas y sin tildes, para que "menjivar" encuentre "Menjívar". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** true si alguno de los campos contiene la búsqueda (sin distinguir tildes ni mayúsculas). */
export function coincide(busqueda: string, ...campos: (string | null | undefined)[]): boolean {
  const q = normalizar(busqueda.trim());
  return !q || campos.some((c) => c && normalizar(c).includes(q));
}

/** "Dra. María Elena Ramos" -> "MR" */
export function iniciales(nombre: string): string {
  const partes = nombre.replace(/^(\S+\.\s+)+/, "").split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] ?? "";
  const segunda = partes.length > 1 ? partes[partes.length >= 4 ? partes.length - 2 : partes.length - 1][0] : "";
  return (primera + segunda).toUpperCase();
}

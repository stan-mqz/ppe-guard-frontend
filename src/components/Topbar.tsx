import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { StatusPill } from "@/components/StatusPill";
import { useSession } from "@/hooks/useSession";
import type { Rol } from "@/types";

const POR_ROL: Record<Rol, { pill: string; etiqueta: string }> = {
  alumno: { pill: "Biometría OK", etiqueta: "Estudiante" },
  docente: { pill: "Sistema activo (IA)", etiqueta: "Portal docente" },
  coordinador: { pill: "Verificación activa", etiqueta: "Coordinador académico" },
  admin: { pill: "Acceso admin supremo", etiqueta: "Administrador general" },
};

interface TopbarProps {
  title: string;
  /** Línea dorada sobre el título (práctica en vivo). */
  eyebrow?: string;
  /** Reemplaza la pill del rol (p. ej. "CONEXIÓN INTERRUMPIDA"). */
  pill?: ReactNode;
  etiqueta?: string;
  /** Botones a la izquierda de la pill. */
  actions?: ReactNode;
}

/** Barra superior de las pantallas autenticadas: título + pill de estado + rol. */
export const Topbar = ({ title, eyebrow, pill, etiqueta, actions }: TopbarProps) => {
  const { payload } = useSession();
  const rol = POR_ROL[payload.rol];

  const derecha = (
    <>
      {actions}
      {pill ?? <StatusPill>{rol.pill}</StatusPill>}
      <span className="border-l border-slate-200 pl-4 text-xs font-semibold uppercase text-slate-500">
        {etiqueta ?? rol.etiqueta}
      </span>
    </>
  );

  if (!eyebrow) return <Header title={title} rightContent={derecha} />;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 p-6 shadow-md">
      <div className="border-l-4 border-blue-900 pl-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">{derecha}</div>
    </header>
  );
};

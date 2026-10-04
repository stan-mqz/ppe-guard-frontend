import { Form, NavLink, Outlet, useLoaderData } from "react-router-dom";
import type { Session } from "@/auth/session";

interface NavItem {
  to: string;
  label: string;
}



// Los enlaces visibles varían por rol, igual que el sidebar del diseño
// (Mis Materias/alumno, Mis Clases + Gestión Alumnos/docente, etc.).
const NAV_BY_ROL: Record<string, NavItem[]> = {
  alumno: [
    { to: "/app/materias", label: "Mis Materias" },
    { to: "/app/historial", label: "Historial de Acceso" },
    { to: "/app/perfil", label: "Perfil Biométrico" },
  ],
  docente: [
    { to: "/app/clases", label: "Mis Clases" },
    { to: "/app/reportes", label: "Reportes EPP" },
    { to: "/app/perfil", label: "Mi perfil" },
  ],
  coordinador: [
    { to: "/app/aulas", label: "Materias" },
    { to: "/app/docentes", label: "Docentes" },
    { to: "/app/reportes", label: "Reportes" },
  ],
  admin: [
    { to: "/app/coordinadores", label: "Coordinadores" },
    { to: "/app/aulas", label: "Materias" },
    { to: "/app/reportes", label: "Reportes" },
  ],
};

export default function AppLayout() {
  // El loader de esta ruta es requireAuth() (ver routes/router.tsx), que ya
  // garantiza que exista sesión antes de llegar aquí.
  const { session } = useLoaderData() as { session: Session };
  const rol = session.payload.rol;
  const items = NAV_BY_ROL[rol] ?? [];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-brand text-white">
        <div>
          <div className="px-6 py-6">
            <p className="text-lg font-bold leading-tight">PPE GUARD</p>
            <p className="text-xs font-semibold tracking-wide text-accent">
              UNIVERSIDAD DE ORIENTE
            </p>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-brand-dark" : "text-white/80 hover:bg-brand-light"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{session.nombre}</p>
          <p className="text-xs uppercase text-white/60">{rol}</p>
          <Form action="/logout" method="post">
            <button
              type="submit"
              className="mt-3 w-full rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-brand-light"
            >
              Cerrar sesión
            </button>
          </Form>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50">

  
        <Outlet />
      </main>
    </div>
  );
}

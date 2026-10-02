import { createBrowserRouter, redirect } from "react-router-dom";

import RootLayout from "@/layouts/RootLayout";
import AppLayout from "@/layouts/AppLayout";
import { requireAuth } from "@/auth/guards";
import { getSession } from "@/auth/session";
import type { Rol } from "@/types";

import { LoginPage, loginAction } from "@/pages/LoginPage";
import { logoutAction } from "@/pages/LogoutAction";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { StubPage } from "@/pages/StubPage";
import { AulasPage, aulasLoader, aulasAction } from "@/pages/coordinador/AulasPage";

// Pantalla de aterrizaje por rol al entrar a "/app" (equivalente a la home de
// cada portal en el diseño: "Mis Materias", "Panel de Control Docente", etc.).
const LANDING_BY_ROL: Record<Rol, string> = {
  alumno: "materias",
  docente: "clases",
  coordinador: "aulas",
  admin: "coordinadores",
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        loader: () => redirect(getSession() ? "/app" : "/login"),
      },
      {
        path: "login",
        element: <LoginPage />,
        action: loginAction,
      },
      {
        path: "logout",
        action: logoutAction,
      },
      {
        path: "app",
        element: <AppLayout />,
        loader: requireAuth(), // cualquier usuario autenticado
        children: [
          {
            index: true,
            loader: () => {
              const session = getSession();
              // requireAuth() del padre ya garantizó que exista sesión.
              return redirect(LANDING_BY_ROL[session!.payload.rol]);
            },
          },

          // --- Alumno ---
          {
            path: "materias",
            loader: requireAuth("alumno"),
            element: <StubPage title="Mis Materias" />,
          },
          {
            path: "historial",
            loader: requireAuth("alumno"),
            element: <StubPage title="Historial de Acceso" />,
          },
          {
            path: "perfil",
            loader: requireAuth("alumno"),
            element: <StubPage title="Perfil Biométrico" />,
          },

          // --- Docente ---
          {
            path: "clases",
            loader: requireAuth("docente"),
            element: <StubPage title="Panel de Control Docente" />,
          },
          {
            path: "alumnos",
            loader: requireAuth("docente"),
            element: <StubPage title="Gestión de Alumnos" />,
          },

          // --- Coordinador / Admin ---
          {
            // aulasLoader incluye la protección por rol ("coordinador") y la
            // carga de datos paginada; ver el comentario en AulasPage.tsx.
            path: "aulas",
            loader: aulasLoader,
            action: aulasAction,
            element: <AulasPage />,
          },
          {
            path: "docentes",
            loader: requireAuth("coordinador"),
            element: <StubPage title="Gestión de Docentes" />,
          },
          {
            path: "coordinadores",
            loader: requireAuth("admin"),
            element: <StubPage title="Gestión de Coordinadores" />,
          },

          // --- Compartido ---
          {
            path: "reportes",
            loader: requireAuth("coordinador", "docente"),
            element: <StubPage title="Reportes EPP" />,
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

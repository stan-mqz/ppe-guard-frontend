import { createBrowserRouter, redirect } from "react-router-dom";

import RootLayout from "@/layouts/RootLayout";
import AppLayout from "@/layouts/AppLayout";
import { renovarSesion } from "@/api/auth";
import { requireAuth } from "@/auth/guards";
import { getSession } from "@/auth/session";
import type { Rol } from "@/types";

import { LoginPage, loginAction } from "@/pages/LoginPage";
import { logoutAction } from "@/pages/LogoutAction";
import { NotFoundPage } from "@/pages/NotFoundPage";
import {
  AulasPage,
  aulasLoader,
  aulasAction,
} from "@/pages/coordinador/AulasPage";
import {
  ClasesPage as DocentesClasesPage,
  ClasesErrorBoundary,
  clasesLoader,
} from "@/pages/docente/ClasesPage";
import {
  SubjectManagement,
  SubjectManagementErrorBoundary,
  subjectManagementAction,
  subjectManagementLoader,
} from "@/pages/docente/SubjectManagament";
import { reportsLoader, ReportsPage } from "@/pages/docente/ReportsPage";
import { perfilDocenteLoader, PerfilDocentePage } from "@/pages/docente/ProfilePage";
import WizardLayout from "@/layouts/WizardLayout";
import { MisMateriasPage } from "@/pages/alumno/MisMateriasPage";
import { HistorialGeneralPage, HistorialMateriaPage } from "@/pages/alumno/HistorialPage";
import { PerfilBiometricoPage } from "@/pages/alumno/PerfilBiometricoPage";
import { InscribirAlumnoPage } from "@/pages/docente/InscribirAlumnoPage";
import { NuevaPracticaPage } from "@/pages/docente/NuevaPracticaPage";
import { PracticaEnVivoPage } from "@/pages/docente/PracticaEnVivoPage";
import { ReporteMateriaPage } from "@/pages/docente/ReporteMateriaPage";
import { DetallePracticaPage } from "@/pages/docente/DetallePracticaPage";
import { PanelPage } from "@/pages/coordinador/PanelPage";
import { GestionMateriasPage } from "@/pages/coordinador/GestionMateriasPage";
import { MateriaFormPage } from "@/pages/coordinador/MateriaFormPage";
import { GestionDocentesPage } from "@/pages/coordinador/GestionDocentesPage";
import { DocenteFormPage } from "@/pages/coordinador/DocenteFormPage";
import { GestionAlumnosPage } from "@/pages/coordinador/GestionAlumnosPage";
import { CentroReportesPage } from "@/pages/coordinador/CentroReportesPage";
import { SeguridadPage } from "@/pages/coordinador/SeguridadPage";
import {
  EnrolamientoCapturaPage,
  EnrolamientoDatosPage,
  EnrolamientoInstruccionesPage,
} from "@/pages/coordinador/EnrolamientoPages";
import { CoordinadoresPage } from "@/pages/admin/CoordinadoresPage";
import { CoordinadorFormPage } from "@/pages/admin/CoordinadorFormPage";

// Pantalla de aterrizaje por rol al entrar a "/app" (equivalente a la home de
// cada portal en el diseño: "Mis Materias", "Panel de Control Docente", etc.).
const LANDING_BY_ROL: Record<Rol, string> = {
  alumno: "materias",
  docente: "clases",
  coordinador: "panel",
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
        // Cualquier usuario autenticado. De paso se renueva el token si está por
        // vencer (POST /auth/refresh), sin bloquear la navegación.
        loader: (args) => {
          void renovarSesion();
          return requireAuth()(args);
        },
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
            element: <MisMateriasPage />,
          },
          {
            path: "materias/:materiaId/historial",
            loader: requireAuth("alumno"),
            element: <HistorialMateriaPage />,
          },
          {
            path: "historial",
            loader: requireAuth("alumno"),
            element: <HistorialGeneralPage />,
          },
          {
            path: "perfil",
            loader: requireAuth("alumno"),
            element: <PerfilBiometricoPage />,
          },

          // --- Docente ---
          {
            path: "clases",
            loader: clasesLoader,
            element: <DocentesClasesPage />,
            errorElement: <ClasesErrorBoundary />,
          },
          {
            // Gestión de Alumnos Inscritos de una materia.
            // subjectManagementLoader ya incluye requireAuth("docente").
            path: "materias/:subjectId",
            loader: subjectManagementLoader,
            action: subjectManagementAction,
            element: <SubjectManagement />,
            errorElement: <SubjectManagementErrorBoundary />,
          },
          {
            path: "materias/:subjectId/inscribir",
            loader: requireAuth("docente"),
            element: <InscribirAlumnoPage />,
          },
          {
            // Pasos 1 y 2 del asistente; ?materia= preselecciona la materia.
            path: "practicas/nueva",
            loader: requireAuth("docente"),
            element: <NuevaPracticaPage />,
          },
          {
            path: "practicas/:practicaId/en-vivo",
            loader: requireAuth("docente"),
            element: <PracticaEnVivoPage />,
          },

          {
            path: "mi-perfil",
            loader: perfilDocenteLoader,
            element: <PerfilDocentePage />,
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
            element: <GestionDocentesPage />,
          },
          { path: "docentes/nuevo", loader: requireAuth("coordinador"), element: <DocenteFormPage /> },
          { path: "docentes/:id/editar", loader: requireAuth("coordinador"), element: <DocenteFormPage /> },
          { path: "panel", loader: requireAuth("coordinador"), element: <PanelPage /> },
          {
            path: "gestion-materias",
            loader: requireAuth("coordinador"),
            element: <GestionMateriasPage />,
          },
          {
            path: "gestion-materias/nueva",
            loader: requireAuth("coordinador"),
            element: <MateriaFormPage />,
          },
          {
            path: "gestion-materias/:id/editar",
            loader: requireAuth("coordinador"),
            element: <MateriaFormPage />,
          },
          { path: "alumnos", loader: requireAuth("coordinador"), element: <GestionAlumnosPage /> },
          {
            path: "centro-reportes",
            loader: requireAuth("coordinador"),
            element: <CentroReportesPage />,
          },
          { path: "seguridad", loader: requireAuth("coordinador"), element: <SeguridadPage /> },
          {
            path: "coordinadores",
            loader: requireAuth("admin"),
            element: <CoordinadoresPage />,
          },
          { path: "coordinadores/nuevo", loader: requireAuth("admin"), element: <CoordinadorFormPage /> },
          {
            path: "coordinadores/:id/editar",
            loader: requireAuth("admin"),
            element: <CoordinadorFormPage />,
          },

          // --- Compartido ---
          {
            path: "reportes",
            loader: reportsLoader,
            element: <ReportsPage />,
          },
          {
            path: "reportes/:materiaId",
            loader: requireAuth("docente", "coordinador"),
            element: <ReporteMateriaPage />,
          },
          {
            path: "reportes/:materiaId/practicas/:practicaId",
            loader: requireAuth("docente", "coordinador"),
            element: <DetallePracticaPage />,
          },
        ],
      },
      {
        // Enrolamiento biométrico: usa su propio layout (el sidebar muestra los
        // pasos), por eso va fuera de AppLayout aunque la URL cuelgue de /app.
        path: "app/alumnos/nuevo",
        element: <WizardLayout />,
        loader: requireAuth("coordinador", "docente"),
        children: [
          { index: true, loader: () => redirect("datos") },
          { path: "datos", element: <EnrolamientoDatosPage /> },
          { path: "instrucciones", element: <EnrolamientoInstruccionesPage /> },
          { path: "captura", element: <EnrolamientoCapturaPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

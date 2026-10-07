# PPE Guard — Frontend

Frontend en React + TypeScript para el backend **PPE_Guard** (FastAPI + MongoDB).
Usa `react-router-dom` en modo **data router** (`createBrowserRouter`) para que
la carga de datos (loaders), el envío de formularios (actions) y el paginado
vivan en las rutas, no en `useEffect`/`useState` repartidos por los componentes.

## 1. Requisitos

- Node.js 20+
- El backend corriendo en `http://localhost:8000` (`uvicorn app.main:app --reload`)

## 2. Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

La app queda en `http://localhost:5173`. En desarrollo, Vite hace proxy de
`/api`, `/ws` y `/static` hacia `http://localhost:8000` (ver `vite.config.ts`),
así que no hace falta tocar CORS ni armar URLs absolutas en el cliente.

> Tu backend ya incluye `http://localhost:5173` en `ALLOWED_ORIGINS`
> (`app/core/config.py`), por lo que también funcionaría sin el proxy si en
> algún momento prefieres apuntar `VITE_API_BASE_URL` directo a `:8000`.

## 3. Usuarios de prueba

Los que siembra `scripts/seed_usuarios.py` en el backend:

| Código     | Contraseña  | Rol         |
| ---------- | ----------- | ----------- |
| `ADMIN001` | `cambiar123`| admin       |
| `COORD001` | `cambiar123`| coordinador |
| `DOC001`   | `cambiar123`| docente     |

## 4. Estructura

```
src/
├── api/            # funciones que llaman al backend (una por recurso)
├── auth/           # sesión (JWT en localStorage) y guards de rutas
├── layouts/        # RootLayout y AppLayout (sidebar por rol)
├── pages/          # una carpeta por rol + páginas compartidas (login, 404)
├── routes/         # router.tsx: único árbol de rutas con loaders/actions
├── types/          # tipos TS calcados de los modelos Pydantic del backend
└── websocket/      # hook para /ws/detections
```

## 5. El patrón de datos (loaders/actions)

Cada ruta que necesita datos los pide en su `loader`; cada formulario que
escribe datos lo hace con un `action`. React Router revalida automáticamente
los loaders activos después de una `action` exitosa — no hace falta
refetch manual.

`src/pages/coordinador/AulasPage.tsx` es el ejemplo de referencia: trae la
lista de aulas en su loader, pagina con `useSearchParams` (`?page=`), y crea
una nueva aula con un `<Form method="post">` + `action`. Para construir el
resto de pantallas del diseño, sigue el mismo patrón:

1. Agrega la función `loader` (y `action` si el formulario escribe algo) en
   el archivo de la página.
2. Regístrala en `src/routes/router.tsx` en el `children` correspondiente.
3. Si necesitas proteger la ruta por rol y no tienes un loader de datos
   propio, usa `requireAuth("rol1", "rol2")` de `src/auth/guards.ts`
   directamente como `loader`. Si sí tienes loader de datos propio, replica
   el chequeo de rol dentro de él (ver el comentario en `AulasPage.tsx`) —
   una ruta solo admite un `loader`.

## 6. Paginado cuando el backend lo soporte

Hoy `GET /api/v1/aulas` (y el resto de listados) devuelven el arreglo
completo, así que `AulasPage` pagina en el cliente. Cuando agregues
`skip`/`limit` (o cursor) al backend, el único cambio es mover esos
parámetros de `aulasLoader` a la llamada `listarAulas()` en
`src/api/aulas.ts`, en vez de cortar el arreglo con `.slice()`.

## 7. Modo demostración (sin backend)

Con `VITE_USE_MOCKS=true` en `.env`, `src/mocks/install.ts` conecta un adapter
de axios (`src/mocks/server.ts`) que responde las mismas rutas `/api/v1/*` con
datos en memoria (`src/mocks/data.ts`) y un retraso de 300–600 ms. Las páginas
y los servicios de `src/api/` no cambian: al quitar la variable, todo vuelve a
hablar con PPE_Guard.

| Código       | Rol         | Usuario                          |
| ------------ | ----------- | -------------------------------- |
| `U20210452`  | alumno      | Gerardo Alberto Argueta Mendoza  |
| `DOC-202101` | docente     | Dra. María Elena Ramos           |
| `EMP-09214`  | coordinador | Lic. Carlos Castillo             |
| `EMP-00001`  | admin       | Dr. Alejandro Gómez              |

Contraseña de todos: `UNIVO*2026`. Los cambios se guardan en `sessionStorage`
(sobreviven a una recarga y se reinician al cerrar la pestaña).

## 8. Contrato con el backend

La referencia es `FRONTEND.md` del repo PPE_Guard. Lo que el frontend ya sigue:

- **Fechas:** llegan en UTC sin zona; se leen con `parseFechaApi` (`src/utils/format.ts`).
- **EPP:** el backend usa las clases del modelo YOLO (`Hardhat`, `Safety Vest`...) y
  lo define por área; `etiquetaEpp` (`src/utils/materia.ts`) las traduce.
- **Cámara:** es la del servidor. Iniciar una práctica y enrolar un alumno no
  piden la cámara del navegador (solo el modo demostración la usa).
- **Práctica en vivo:** MJPEG de `GET /api/v1/stream` + eventos de
  `/ws/detections` (`useDetectionsSocket`): alumno identificado → Confirmar
  (`POST /practicas/{id}/confirmar`) → revisión de 6 s → asistencia registrada.
- **Materias:** `GET /materias/{id}` y `PATCH /materias/{id}` (solo nombre,
  carrera, facultad y aula; área y docente no se pueden cambiar).

## 9. Pendiente en el backend

Lo que las pantallas usan y PPE_Guard todavía no expone está marcado como
`PENDIENTE EN BACKEND` en `src/api/` y simulado en `src/mocks/server.ts`:

- Listar y editar usuarios (docentes, alumnos, coordinadores), desactivarlos,
  buscar en el padrón, importar CSV, cambiar contraseña y el resumen del panel.
  Contra el backend real esas pantallas muestran su estado de error; los
  formularios de materia y docente piden el `_id` a mano.
- Endpoints para el alumno: no puede consultar materias (403), así que "Mis
  Materias" falla y su historial se muestra sin materia ni establecimiento.
- Código, sección y EPP por materia; número y tema de la práctica; eliminar
  materia; reasignar docente (`src/types/portal.ts`).
- Listar las prácticas de una materia: se reconstruye agrupando
  `GET /asistencias` por `practica_id`, así que las prácticas sin asistencias
  no aparecen.

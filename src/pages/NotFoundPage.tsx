import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export function NotFoundPage() {
  // En la ruta "*" no hay error de ruta (undefined) -> se trata como 404.
  const error = useRouteError();
  const isNotFound = !error || (isRouteErrorResponse(error) && error.status === 404);

  if (!isNotFound) console.error(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-bold text-brand">{isNotFound ? "404" : "Error"}</h1>
      <p className="text-slate-500">
        {isNotFound
          ? "La página que buscas no existe."
          : "Ocurrió un error al cargar esta página. Revisa la consola para más detalles."}
      </p>
      <Link to="/" className="text-sm font-semibold text-brand underline">
        Volver al inicio
      </Link>
    </div>
  );
}
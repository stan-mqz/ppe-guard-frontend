import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-bold text-brand">404</h1>
      <p className="text-slate-500">La página que buscas no existe.</p>
      <Link to="/" className="text-sm font-semibold text-brand underline">
        Volver al inicio
      </Link>
    </div>
  );
}

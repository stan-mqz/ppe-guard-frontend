interface StubPageProps {
  title: string;
}

/** Placeholder para las pantallas del diseño que aún no se han construido. */
export function StubPage({ title }: StubPageProps) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        TODO: construir esta pantalla según el diseño ("Sin título (1).pdf").
      </p>
    </div>
  );
}

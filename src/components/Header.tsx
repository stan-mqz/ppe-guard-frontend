import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  /** Contenido opcional alineado a la derecha (badges, enlaces, etc.). */
  rightContent?: ReactNode;
}

export const Header = ({ title, rightContent }: HeaderProps) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 p-6 text-md font-bold shadow-md">
      <h1 className="border-l-4 border-blue-900 pl-4 text-2xl font-bold text-slate-800">
        {title}
      </h1>
      {rightContent && <div className="flex items-center gap-4">{rightContent}</div>}
    </header>
  );
};
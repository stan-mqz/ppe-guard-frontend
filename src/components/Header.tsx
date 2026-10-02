interface HeaderProps {
    title: string;
}

export const Header = ({title}:HeaderProps) => {
  return (
    <header className="border-b-2 p-6 font-bold text-md shadow-md">
        <h1 className="border-l-4 border-blue-900 pl-4 text-2xl font-bold text-slate-800">
            {title}
        </h1>
    </header>
  )
}

import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const BackLink = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    {children}
  </Link>
);

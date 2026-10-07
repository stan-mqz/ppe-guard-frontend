export const EppTag = ({ children }: { children: string }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
    {children}
  </span>
);

export const EppTags = ({ epp }: { epp: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {epp.length === 0 ? (
      <span className="text-xs text-slate-400">Sin EPP definido</span>
    ) : (
      epp.map((item) => <EppTag key={item}>{item}</EppTag>)
    )}
  </div>
);

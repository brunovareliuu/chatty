export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    // En celular el título se achica y la acción baja de renglón si no cabe.
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-4 md:px-6 md:py-5">
      <div className="min-w-0 space-y-1">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] leading-none md:text-[26px]">{title}</h1>
        {description && <p className="text-[13.5px] text-muted md:text-[14px]">{description}</p>}
      </div>
      {action}
    </header>
  );
}

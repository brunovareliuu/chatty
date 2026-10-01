
/** Estado vacío: un icono tenue en su círculo, una frase y, si hay, qué hacer. */
export function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-fill-soft">
        <Icon className="h-6 w-6 text-muted" strokeWidth={1.6} />
      </div>
      <div className="space-y-1">
        <p className="text-[17px] font-semibold tracking-[-0.012em]">{title}</p>
        {description && <p className="max-w-sm text-[14px] leading-snug text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}


export function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface-2">
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-[16px] font-semibold">{title}</p>
        {description && <p className="max-w-sm text-[14px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

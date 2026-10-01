/**
 * El título grande de cada pantalla, como en las apps de Apple: 34 px en
 * negritas, una línea gris que dice qué hay aquí y las acciones a la derecha,
 * alineadas con la base del texto. Sin filo abajo: la página gris y las
 * tarjetas separan solas.
 *
 * Todo va en el margen `px-pagina`; el contenido de la pantalla debe usar el
 * mismo para que las orillas coincidan. `toolbar` es el renglón de filtros de
 * debajo (segmentado a la izquierda, búsqueda a la derecha).
 */
export function PageHeader({
  title,
  description,
  action,
  toolbar,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  return (
    <header className="px-pagina shrink-0 pt-6 pb-5 md:pt-10 md:pb-6">
      {/* En celular el título se achica y la acción baja de renglón si no cabe. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-[26rem]">
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.022em] md:text-[34px]">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-[90ch] text-[14px] leading-snug text-muted md:text-[14.5px]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
      </div>
      {toolbar && <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{toolbar}</div>}
    </header>
  );
}

import { cn } from '@/lib/utils';

/** Iniciales como respaldo: las fotos de perfil de Meta caducan seguido. */
function initials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Sin foto quedan las iniciales en blanco sobre el gris de Contactos.
        'monograma relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/*
        Las iniciales van SIEMPRE debajo y la foto encima. Las URLs del CDN de
        Meta caducan en horas: cuando eso pasa, la imagen se esconde sola y
        aparecen las iniciales, en vez del icono de imagen rota del navegador.
      */}
      <span className="font-semibold tracking-normal" style={{ fontSize: Math.max(10, size * 0.38) }}>
        {initials(name)}
      </span>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ''}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

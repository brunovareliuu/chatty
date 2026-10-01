import { Heart, MessageCircle, Send, Sparkles, TrendingUp, Zap } from 'lucide-react';
import type { ModuloId } from '@/lib/guia/pasos';
import { cn } from '@/lib/utils';

/**
 * Cómo se ve cada sección ya funcionando, con datos de ejemplo (todos de
 * ficción). En el modo guía van arriba de los pasos: así, desde que abres el
 * panel, ves el sistema y no una página de instrucciones.
 */
export function VistaPrevia({ modulo }: { modulo: ModuloId }) {
  const Vista = VISTAS[modulo];
  return (
    <figure className="tarjeta overflow-hidden">
      <figcaption className="flex items-center gap-2 border-b border-hairline px-4 py-2.5 text-[12px] font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Vista previa · datos de ejemplo
      </figcaption>
      <div aria-hidden className="pointer-events-none bg-page select-none">
        <Vista />
      </div>
    </figure>
  );
}

/** Iniciales sin foto, en el gris de Contactos, como las del panel. */
const Inicial = ({ nombre, tam = 32 }: { nombre: string; tam?: number }) => (
  <span
    className="monograma grid shrink-0 place-items-center rounded-full font-semibold"
    style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.38) }}
  >
    {nombre[0].toUpperCase()}
  </span>
);

/** «● Activa»: el punto dice el estado y el texto gris lo nombra. */
const Activa = () => (
  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-muted">
    <span className="h-1.5 w-1.5 rounded-full bg-pos" />
    Activa
  </span>
);

const tarjeta = 'rounded-[14px] border border-hairline bg-card shadow-card';

function VistaBandeja() {
  const hilos = [
    { quien: 'lucia.fotos', texto: '¿Me mandas el link de la guía?', hace: '2 min', nuevos: 2 },
    { quien: 'cafe.norte', texto: 'Comentó: GUÍA', hace: '14 min', nuevos: 1 },
    { quien: 'mau.diseña', texto: '¡Gracias! Ya lo vi', hace: '1 h', nuevos: 0 },
  ];
  return (
    <div className="p-3 md:p-4">
      <div className={cn(tarjeta, 'grid grid-cols-1 overflow-hidden md:h-[300px] md:grid-cols-[240px_1fr]')}>
        <div className="pb-2 md:border-r md:border-hairline">
          <p className="px-4 pt-3.5 pb-2 text-[12px] font-medium text-muted">Abiertas · 3</p>
          {hilos.map((h, i) => (
            <div key={h.quien} className={cn('mx-2 flex items-center gap-3 rounded-[10px] px-2.5 py-2', i === 0 && 'bg-surface')}>
              <Inicial nombre={h.quien} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">@{h.quien}</p>
                <p className="truncate text-[12px] text-muted">{h.texto}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-faint">{h.hace}</span>
                {h.nuevos > 0 && <span className="h-2 w-2 rounded-full bg-accent" />}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-col md:flex">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-2.5">
            <Inicial nombre="lucia" tam={28} />
            <p className="text-[13px] font-semibold">@lucia.fotos</p>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-1.5 px-4 py-3">
            <p className="max-w-[70%] self-start rounded-[17px] bg-surface-2 px-3 py-2 text-[13px]">
              Hola, vi tu reel. ¿Me mandas el link de la guía?
            </p>
            <p className="max-w-[70%] self-end rounded-[17px] bg-accent px-3 py-2 text-[13px] text-accent-fg">
              ¡Claro, Lucía! Aquí va: tumarca.com/guia 🙌
            </p>
            <p className="self-end text-[11px] text-faint">Lo mandó la automatización GUÍA</p>
          </div>
          <div className="m-3 mt-0 flex items-center gap-2 rounded-[18px] border border-border bg-field py-1.5 pr-1.5 pl-3.5 text-[13px] text-faint">
            <span className="flex-1">Escribe un mensaje…</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-fill text-faint">
              <Send className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VistaAutomatizaciones() {
  const reglas = [
    { nombre: 'GUÍA', tipo: 'Comentario en publicación', veces: 128 },
    { nombre: 'PRECIO', tipo: 'Palabra clave en DM', veces: 41 },
  ];
  const nodos = ['Comentó GUÍA', '¿Me sigue?', 'Manda el link'];
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_1.1fr] md:p-5">
      <div className="space-y-2.5">
        {reglas.map((r) => (
          <div key={r.nombre} className={cn(tarjeta, 'p-3.5')}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-soft text-accent">
                <Zap className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">{r.nombre}</p>
              <Activa />
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {r.tipo} · se disparó {r.veces} veces
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center rounded-[14px] bg-[radial-gradient(circle,color-mix(in_srgb,var(--faint)_45%,transparent)_1px,transparent_1.3px)] [background-size:16px_16px] py-4">
        {nodos.map((n, i) => (
          <div key={n} className="flex flex-col items-center">
            <span
              className={cn(
                'flex items-center gap-2 rounded-[12px] border border-hairline bg-card px-3.5 py-2 text-[12.5px] font-semibold shadow-card',
                i === 0 && 'border-accent',
              )}
            >
              {i === 0 && <span className="h-2 w-2 rounded-full bg-accent" />}
              {n}
            </span>
            {i < nodos.length - 1 && <span className="h-5 w-px bg-faint/60" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaContactos() {
  const gente = [
    { quien: 'lucia.fotos', etiquetas: ['guía', 'te sigue'], cuando: 'hoy' },
    { quien: 'cafe.norte', etiquetas: ['precio', 'lead'], cuando: 'ayer' },
    { quien: 'mau.diseña', etiquetas: ['anuncio'], cuando: 'hace 3 d' },
  ];
  return (
    <div className="p-4 md:p-5">
      <div className={cn(tarjeta, 'divide-y divide-hairline overflow-hidden')}>
        {gente.map((g) => (
          <div key={g.quien} className="flex items-center gap-3 px-4 py-2.5">
            <Inicial nombre={g.quien} />
            <p className="w-32 truncate text-[13px] font-semibold">@{g.quien}</p>
            <div className="flex flex-1 flex-wrap gap-1">
              {g.etiquetas.map((e) => (
                <span key={e} className="rounded-full bg-fill-soft px-2 py-0.5 text-[11px] font-medium text-muted">
                  {e}
                </span>
              ))}
            </div>
            <span className="text-[11.5px] text-faint">{g.cuando}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaEstadisticas() {
  const cifras = [
    { etiqueta: 'Seguidores', valor: '1,248', cambio: '+32' },
    { etiqueta: 'Alcance', valor: '18,406', cambio: '+12 %' },
    { etiqueta: 'Vistas', valor: '42,910', cambio: '+8 %' },
    { etiqueta: 'Interacciones', valor: '3,127', cambio: '+5 %' },
  ];
  const barras = [34, 48, 41, 62, 55, 78, 70, 58, 86, 74, 92, 81, 67, 88];
  return (
    <div className="space-y-3 p-4 md:p-5">
      {/* Una tarjeta partida en celdas, como las cifras del panel. */}
      <div className={cn(tarjeta, 'grid grid-cols-2 overflow-hidden md:grid-cols-4')}>
        {cifras.map((c, i) => (
          <div
            key={c.etiqueta}
            className={cn('border-hairline px-4 py-3', i % 2 === 1 && 'border-l', i >= 2 && 'border-t md:border-t-0', i === 2 && 'md:border-l')}
          >
            <p className="text-[12px] font-medium text-muted">{c.etiqueta}</p>
            <p className="tabular mt-1 text-[22px] leading-none font-semibold tracking-[-0.02em]">{c.valor}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-pos">
              <TrendingUp className="h-3 w-3" /> {c.cambio}
            </p>
          </div>
        ))}
      </div>
      <div className={cn(tarjeta, 'p-4')}>
        <p className="mb-3 text-[12px] font-medium text-muted">Seguidores nuevos · 14 días</p>
        <div className="flex h-24 items-end gap-1.5">
          {/* Como Tiempo en pantalla: la barra que importa en el acento, las demás en gris. */}
          {barras.map((b, i) => (
            <span
              key={i}
              className={cn('flex-1 rounded-t-[4px]', i === barras.length - 1 ? 'bg-accent' : 'bg-faint/55')}
              style={{ height: `${b}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2.5">
        {[
          ['Reel · 4,210 vistas', '312'],
          ['Carrusel · 1,980 vistas', '188'],
          ['Post · 1,102 vistas', '96'],
        ].map(([t, l]) => (
          <div key={t} className={cn(tarjeta, 'flex-1 p-2')}>
            <div className="mb-2 h-16 rounded-[9px] bg-gradient-to-br from-accent/25 to-surface-2" />
            <p className="truncate px-1 text-[11.5px] font-semibold">{t}</p>
            <p className="mt-0.5 flex items-center gap-1 px-1 text-[11px] text-muted">
              <Heart className="h-3 w-3" /> {l}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaAsistente() {
  return (
    <div className="p-4 md:p-5">
      <div className={cn(tarjeta, 'space-y-3 p-4')}>
        <p className="ml-auto w-fit max-w-[80%] rounded-[18px] bg-accent px-3.5 py-2.5 text-[13px] text-accent-fg">
          Cuando comenten GUÍA en mi último post, mándales el link de mi guía, pero solo si me siguen
        </p>
        <div className="flex gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </span>
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="text-[13px] leading-relaxed">
              Listo. Creé la automatización en tu último reel, con cuatro respuestas públicas distintas y el DM
              solo para quien te sigue.
            </p>
            <div className={cn(tarjeta, 'p-3.5')}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-soft text-accent">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <p className="flex-1 text-[13.5px] font-semibold">GUÍA</p>
                <Activa />
              </div>
              <p className="mt-1.5 text-[12px] text-muted">Comentario en publicación · pide que te siga · 4 respuestas públicas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VistaAjustes() {
  return (
    <div className="p-4 md:p-5">
      {/* El segmentado de Ajustes, con Instagram elegido. */}
      <div className="segmentado mb-4">
        {['Notificaciones', 'Instagram', 'Marca', 'Sistema'].map((t, i) => (
          <span
            key={t}
            className={cn(
              'inline-flex h-7 items-center rounded-[7px] px-3 text-[12.5px]',
              i === 1 ? 'bg-control font-semibold shadow-control' : 'font-medium',
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className={cn(tarjeta, 'divide-y divide-hairline px-4')}>
        <div className="flex items-center gap-3 py-3">
          <Inicial nombre="tumarca" tam={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">@tumarca</p>
            <p className="text-[12px] text-muted">Token válido 58 días más · se renueva solo</p>
          </div>
          <Activa />
        </div>
        <div className="flex items-center gap-2 py-3 text-[12.5px] text-muted">
          <MessageCircle className="h-3.5 w-3.5" /> Avisos en 2 dispositivos
        </div>
      </div>
    </div>
  );
}

const VISTAS: Record<ModuloId, () => React.JSX.Element> = {
  bandeja: VistaBandeja,
  automatizaciones: VistaAutomatizaciones,
  contactos: VistaContactos,
  estadisticas: VistaEstadisticas,
  asistente: VistaAsistente,
  ajustes: VistaAjustes,
};

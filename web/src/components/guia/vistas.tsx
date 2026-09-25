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
    <figure className="overflow-hidden rounded-panel border border-border bg-bg">
      <figcaption className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 text-[11.5px] font-semibold text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Vista previa · datos de ejemplo
      </figcaption>
      <div aria-hidden className="pointer-events-none select-none">
        <Vista />
      </div>
    </figure>
  );
}

const Inicial = ({ nombre, tono }: { nombre: string; tono: string }) => (
  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white', tono)}>
    {nombre[0].toUpperCase()}
  </span>
);

function VistaBandeja() {
  const hilos = [
    { quien: 'lucia.fotos', texto: '¿Me mandas el link de la guía?', hace: '2 min', nuevos: 2, tono: 'bg-accent text-accent-fg' },
    { quien: 'cafe.norte', texto: 'Comentó: GUÍA', hace: '14 min', nuevos: 1, tono: 'bg-pos' },
    { quien: 'mau.diseña', texto: '¡Gracias! Ya lo vi', hace: '1 h', nuevos: 0, tono: 'bg-warn' },
  ];
  return (
    <div className="grid grid-cols-1 md:h-[300px] md:grid-cols-[240px_1fr]">
      <div className="bg-surface pb-2 md:border-r md:border-border">
        <p className="px-4 pt-4 pb-2 text-[12px] font-semibold text-muted">Abiertas · 3</p>
        {hilos.map((h, i) => (
          <div key={h.quien} className={cn('flex items-center gap-3 px-4 py-2.5', i === 0 && 'bg-surface-2')}>
            <Inicial nombre={h.quien} tono={h.tono} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">@{h.quien}</p>
              <p className="truncate text-[12px] text-muted">{h.texto}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-faint">{h.hace}</span>
              {h.nuevos > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
                  {h.nuevos}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-col md:flex">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Inicial nombre="lucia" tono="bg-accent text-accent-fg" />
          <p className="text-[13px] font-semibold">@lucia.fotos</p>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 px-4 py-3">
          <p className="max-w-[70%] self-start rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2 text-[13px]">
            Hola, vi tu reel. ¿Me mandas el link de la guía?
          </p>
          <p className="max-w-[70%] self-end rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[13px] text-accent-fg">
            ¡Claro, Lucía! Aquí va: tumarca.com/guia 🙌
          </p>
          <p className="self-end text-[11px] text-faint">Lo mandó la automatización GUÍA</p>
        </div>
        <div className="m-3 mt-0 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-[13px] text-faint">
          <span className="flex-1">Escribe un mensaje…</span>
          <Send className="h-4 w-4" />
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
    <div className="grid gap-4 p-5 md:grid-cols-[1fr_1.1fr]">
      <div className="space-y-2.5">
        {reglas.map((r) => (
          <div key={r.nombre} className="rounded-card border border-border bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
                <Zap className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 text-[14px] font-bold">{r.nombre}</p>
              <span className="rounded-full bg-pos/15 px-2 py-0.5 text-[11px] font-semibold text-pos">Activa</span>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {r.tipo} · se disparó {r.veces} veces
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center gap-0 rounded-card border border-dashed border-border py-4">
        {nodos.map((n, i) => (
          <div key={n} className="flex flex-col items-center">
            <span className="rounded-xl border border-border bg-surface px-4 py-2 text-[12.5px] font-semibold shadow-sm">{n}</span>
            {i < nodos.length - 1 && <span className="h-5 w-px bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaContactos() {
  const gente = [
    { quien: 'lucia.fotos', etiquetas: ['guía', 'te sigue'], cuando: 'hoy', tono: 'bg-accent text-accent-fg' },
    { quien: 'cafe.norte', etiquetas: ['precio', 'lead'], cuando: 'ayer', tono: 'bg-pos' },
    { quien: 'mau.diseña', etiquetas: ['anuncio'], cuando: 'hace 3 d', tono: 'bg-warn' },
  ];
  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {gente.map((g) => (
          <div key={g.quien} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Inicial nombre={g.quien} tono={g.tono} />
            <p className="w-32 truncate text-[13px] font-semibold">@{g.quien}</p>
            <div className="flex flex-1 flex-wrap gap-1">
              {g.etiquetas.map((e) => (
                <span key={e} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
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
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {cifras.map((c) => (
          <div key={c.etiqueta} className="rounded-card border border-border bg-surface p-3">
            <p className="text-[11.5px] font-medium text-muted">{c.etiqueta}</p>
            <p className="mt-1 text-[20px] leading-none font-bold tabular-nums">{c.valor}</p>
            <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-pos">
              <TrendingUp className="h-3 w-3" /> {c.cambio}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-card border border-border bg-surface p-4">
        <p className="mb-3 text-[12px] font-semibold text-muted">Seguidores nuevos · 14 días</p>
        <div className="flex h-24 items-end gap-1.5">
          {barras.map((b, i) => (
            <span key={i} className="flex-1 rounded-t-md bg-accent/80" style={{ height: `${b}%` }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2.5">
        {[
          ['Reel · 4,210 vistas', '312'],
          ['Carrusel · 1,980 vistas', '188'],
          ['Post · 1,102 vistas', '96'],
        ].map(([t, l]) => (
          <div key={t} className="flex-1 rounded-card border border-border bg-surface p-3">
            <div className="mb-2 h-16 rounded-lg bg-gradient-to-br from-accent/25 to-surface-2" />
            <p className="truncate text-[11.5px] font-semibold">{t}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
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
    <div className="space-y-3 p-5">
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-[13px] text-accent-fg">
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
          <div className="rounded-card border border-border bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <p className="flex-1 text-[13.5px] font-bold">GUÍA</p>
              <span className="rounded-full bg-pos/15 px-2 py-0.5 text-[11px] font-semibold text-pos">Activa</span>
            </div>
            <p className="mt-1.5 text-[12px] text-muted">Comentario en publicación · pide que te siga · 4 respuestas públicas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VistaAjustes() {
  return (
    <div className="p-5">
      <div className="mb-4 flex gap-1 border-b border-border">
        {['Notificaciones', 'Instagram', 'Marca', 'Sistema'].map((t, i) => (
          <span
            key={t}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold',
              i === 1 ? 'border-accent text-txt' : 'border-transparent text-muted',
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
        <Inicial nombre="tumarca" tono="bg-accent text-accent-fg" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold">@tumarca</p>
          <p className="text-[12px] text-muted">Token válido 58 días más · se renueva solo</p>
        </div>
        <span className="rounded-full bg-pos/15 px-2 py-0.5 text-[11px] font-semibold text-pos">Activa</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
        <MessageCircle className="h-3.5 w-3.5" /> Avisos en 2 dispositivos
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

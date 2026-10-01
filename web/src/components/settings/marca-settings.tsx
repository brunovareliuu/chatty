'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImageUp, MessageCircle, Palette, Pipette, RotateCcw, TriangleAlert, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { LogoConNombre, LogoMarca } from '@/components/identidad/logo';
import { borrarLocal, guardarLocal, useEditorIdentidad, useIdentidadLocal } from '@/components/identidad/proveedor';
import { marcar } from '@/components/guia/hechos';
import {
  COLORES,
  DE_FABRICA,
  LOGO_LADO,
  LOGO_MAX,
  NOMBRE_MAX,
  coloresDe,
  esHex,
  sePierdeEnClaro,
  type Identidad,
} from '@/lib/identidad/tipos';
import { cn } from '@/lib/utils';
import { Grupo, IconoFila, Nota, Seccion } from './grupo';

/**
 * Ajustes › Marca: cómo se llama el panel, su logo y su color. Mientras
 * eliges, todo el panel se tiñe (la vista previa del proveedor); nada se
 * guarda hasta darle Guardar. En el modo guía se guarda en este navegador; ya
 * conectado, en Firestore, para todos y para el ícono del celular.
 */

type Borrador = Omit<Identidad, 'actualizadoEn'>;

const sinFecha = (i: Identidad): Borrador => ({
  nombre: i.nombre,
  acento: i.acento,
  logo: i.logo,
  logoCompleto: i.logoCompleto,
});
const igual = (a: Borrador, b: Borrador) =>
  a.nombre === b.nombre && a.acento === b.acento && a.logo === b.logo && a.logoCompleto === b.logoCompleto;
const FABRICA = sinFecha(DE_FABRICA);

export function MarcaSettings() {
  const { guardada, local, vistaPrevia, seGuardo } = useEditorIdentidad();
  const deLaGuia = useIdentidadLocal();
  const router = useRouter();
  const archivo = useRef<HTMLInputElement>(null);

  // Lo que cambiaste encima de lo guardado; `null` es sin cambios.
  const [cambios, setCambios] = useState<Borrador | null>(null);
  const [hexEscrito, setHexEscrito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const base = sinFecha(guardada);
  const borrador = cambios ?? base;
  const hayCambios = !igual(borrador, base);
  const colores = coloresDe(borrador.acento);
  const esOtro = !COLORES.some((c) => c.hex === borrador.acento);

  // Si sales de la pantalla sin guardar, el panel vuelve a como estaba.
  useEffect(() => () => vistaPrevia(null), [vistaPrevia]);

  function cambiar(parcial: Partial<Borrador>) {
    const siguiente = { ...borrador, ...parcial };
    const distinto = !igual(siguiente, base);
    setCambios(distinto ? siguiente : null);
    vistaPrevia(
      distinto
        ? { ...siguiente, nombre: siguiente.nombre.trim() || DE_FABRICA.nombre, actualizadoEn: guardada.actualizadoEn }
        : null,
    );
  }

  function elegirColor(hex: string) {
    setHexEscrito(null);
    cambiar({ acento: hex.toLowerCase() });
  }

  function escribirHex(v: string) {
    setHexEscrito(v);
    const hex = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`;
    if (esHex(hex)) cambiar({ acento: hex.toLowerCase() });
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { png, completo } = await preparaLogo(f);
      cambiar({ logo: png, logoCompleto: completo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo leer esa imagen');
    }
  }

  function descartar() {
    setCambios(null);
    setHexEscrito(null);
    vistaPrevia(null);
  }

  async function guardar() {
    const nombre = borrador.nombre.trim();
    if (!nombre) {
      toast.error('Ponle un nombre al panel');
      return;
    }
    setGuardando(true);
    try {
      if (local) {
        if (igual({ ...borrador, nombre }, FABRICA)) borrarLocal();
        else guardarLocal({ ...borrador, nombre });
      } else {
        const res = await fetch('/api/identidad', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            acento: borrador.acento,
            logoCompleto: borrador.logoCompleto,
            // El logo solo viaja si cambió: el que ya está se queda solo.
            ...(borrador.logo !== base.logo ? { logo: borrador.logo } : {}),
          }),
        });
        const r = (await res.json().catch(() => ({}))) as { identidad?: Identidad; error?: string };
        if (!res.ok || !r.identidad) throw new Error(r.error ?? 'No se guardó la marca');
        seGuardo(r.identidad);
        router.refresh();
      }
      setCambios(null);
      setHexEscrito(null);
      vistaPrevia(null);
      marcar('marca', true);
      toast.success(local ? 'Marca guardada en este navegador' : 'Marca guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se guardó la marca');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-8">
      {local ? (
        <div className="px-1">
          <h2 className="text-[20px] font-semibold tracking-[-0.018em]">Tu marca</h2>
          <p className="mt-1 max-w-xl text-[13.5px] leading-snug text-muted">
            Esto ya funciona: elige el nombre, el logo y el color, y míralo en todo el panel. Se guarda en este
            navegador hasta que conectes tu Firebase.
          </p>
        </div>
      ) : (
        deLaGuia &&
        guardada.actualizadoEn === null &&
        !hayCambios && (
          <div className="tarjeta flex flex-wrap items-center gap-3 rounded-card px-4 py-3 text-[13.5px]">
            <IconoFila tono="acento">
              <Palette strokeWidth={1.9} />
            </IconoFila>
            <span className="min-w-0 flex-1">
              En el modo guía elegiste <span className="font-semibold">{deLaGuia.nombre}</span> con su color. ¿La usas
              aquí?
            </span>
            <Button size="sm" variant="primary" onClick={() => cambiar(sinFecha(deLaGuia))}>
              Usarla
            </Button>
          </div>
        )
      )}

      {/* --- Nombre y logo --- */}
      <Seccion titulo="Nombre y logo">
        <Grupo>
          <div className="flex flex-wrap items-center gap-4 py-4">
            <LogoMarca tam={56} identidad={borrador} />
            {/* Con 180 px de mínimo, en el celular los botones bajan a su propia línea. */}
            <div className="min-w-[180px] flex-1">
              <p className="text-[14px] font-medium">Logo</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                PNG, JPG o SVG. Cuadrado y con fondo transparente queda mejor. Sin logo va la burbuja.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => archivo.current?.click()}>
                <ImageUp className="h-3.5 w-3.5" />
                {borrador.logo ? 'Cambiar' : 'Subir logo'}
              </Button>
              {borrador.logo && (
                <Button size="sm" variant="ghost" onClick={() => cambiar({ logo: null, logoCompleto: false })}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </Button>
              )}
            </div>
            <input
              ref={archivo}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={subirLogo}
            />
          </div>

          {borrador.logo && (
            <div className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">Sobre tu color</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted">Apágalo si tu logo ya trae su propio fondo.</p>
              </div>
              <Switch checked={!borrador.logoCompleto} onCheckedChange={(v) => cambiar({ logoCompleto: !v })} />
            </div>
          )}

          <div className="py-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="marca-nombre" className="text-[14px] font-medium">
                Nombre del panel
              </label>
              <span className="tabular text-[12px] text-faint">
                {Array.from(borrador.nombre).length}/{NOMBRE_MAX}
              </span>
            </div>
            <Input
              id="marca-nombre"
              value={borrador.nombre}
              maxLength={NOMBRE_MAX}
              placeholder={DE_FABRICA.nombre}
              onChange={(e) => cambiar({ nombre: e.target.value })}
            />
          </div>
        </Grupo>
        <Nota>Sale en la barra, en el login, en la pestaña del navegador y en el ícono del celular.</Nota>
      </Seccion>

      {/* --- Color --- */}
      <Seccion titulo="Color" descripcion="El del botón principal, lo activo del menú y los avisos. Úsalo poco y se nota más.">
        <Grupo>
          <div className="flex flex-wrap gap-x-2 gap-y-3 py-4">
            {COLORES.map((c) => {
              const activo = borrador.acento === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => elegirColor(c.hex)}
                  aria-pressed={activo}
                  className="group flex w-[62px] flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow',
                      activo ? 'ring-2 ring-txt' : 'ring-1 ring-border group-hover:ring-2 group-hover:ring-faint',
                    )}
                    style={{ background: c.hex, color: coloresDe(c.hex).marcaFg }}
                  >
                    {activo && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className={cn('text-[12px]', activo ? 'font-semibold text-txt' : 'font-medium text-muted')}>
                    {c.nombre}
                  </span>
                </button>
              );
            })}
            <label className="group flex w-[62px] cursor-pointer flex-col items-center gap-1.5">
              <span
                className={cn(
                  'relative grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-card transition-shadow',
                  esOtro ? 'ring-2 ring-txt' : 'ring-1 ring-border group-hover:ring-2 group-hover:ring-faint',
                )}
                style={{
                  background: esOtro
                    ? borrador.acento
                    : `conic-gradient(${[...COLORES, COLORES[0]].map((c) => c.hex).join(', ')})`,
                  color: esOtro ? colores.marcaFg : undefined,
                }}
              >
                {esOtro ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <Pipette className="h-4 w-4 text-white drop-shadow" />
                )}
                <input
                  type="color"
                  value={borrador.acento}
                  onChange={(e) => elegirColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Elegir otro color"
                />
              </span>
              <span className={cn('text-[12px]', esOtro ? 'font-semibold text-txt' : 'font-medium text-muted')}>Otro</span>
            </label>
          </div>

          <div className="flex items-center gap-3 py-3">
            <label htmlFor="marca-hex" className="min-w-0 flex-1 text-[14px] font-medium">
              Hex
            </label>
            <Input
              id="marca-hex"
              value={hexEscrito ?? borrador.acento}
              onChange={(e) => escribirHex(e.target.value)}
              onBlur={() => setHexEscrito(null)}
              maxLength={7}
              spellCheck={false}
              className="w-[112px] font-mono text-[13px]"
            />
          </div>

          {sePierdeEnClaro(borrador.acento) && (
            <div className="flex items-start gap-3 py-3">
              <IconoFila className="bg-warn/12 text-warn">
                <TriangleAlert strokeWidth={1.9} />
              </IconoFila>
              <p className="min-w-0 flex-1 pt-0.5 text-[12.5px] leading-snug text-muted">
                Sobre blanco este color se lee poco: los textos y los íconos en tu color van a costar trabajo. Prueba
                uno más oscuro.
              </p>
            </div>
          )}
          {colores.marcaOscuro !== colores.marca && (
            <div className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center">
                <span className="h-4 w-4 rounded-full" style={{ background: colores.marcaOscuro }} />
              </span>
              <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted">
                En modo oscuro se aclara a este tono para que se vea sobre negro.
              </p>
            </div>
          )}
        </Grupo>
      </Seccion>

      {/* --- Así se ve --- */}
      <section className="space-y-2.5">
        <div className="flex items-end justify-between gap-3 px-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Así se ve</h2>
          {!igual(borrador, FABRICA) && (
            <button
              type="button"
              onClick={() => {
                setHexEscrito(null);
                cambiar(FABRICA);
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-txt"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Volver a la de fábrica
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Muestra modo="claro" borrador={borrador} />
          <Muestra modo="oscuro" borrador={borrador} />
        </div>
        {!local && (
          <Nota>
            Lo ven todos los que entran al panel. Si ya agregaste la app a la pantalla de inicio del iPhone, el nombre
            y el ícono nuevos salen al volver a agregarla.
          </Nota>
        )}
      </section>

      {hayCambios && (
        // Flota abajo, como la barra de guardar de Ajustes del Mac.
        <div className="vidrio sticky bottom-3 z-10 flex items-center gap-2 rounded-[14px] border border-hairline py-2 pr-2 pl-4 shadow-float">
          <p className="hidden min-w-0 flex-1 text-[13px] text-muted sm:block">
            {local ? 'Así se ve tu panel. ¿Lo guardas?' : 'Así se ve tu panel. Al guardar, lo ven todos.'}
          </p>
          <Button variant="ghost" size="sm" onClick={descartar} disabled={guardando} className="ml-auto sm:ml-0">
            Descartar
          </Button>
          <Button variant="primary" size="sm" onClick={guardar} loading={guardando}>
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}

/** Un pedazo del panel con tu marca, en claro o en oscuro, aunque la pantalla esté en el otro. */
function Muestra({ modo, borrador }: { modo: 'claro' | 'oscuro'; borrador: Borrador }) {
  return (
    <div
      aria-hidden
      className={cn(
        modo === 'claro' ? 'claro' : 'dark',
        'tarjeta pointer-events-none flex overflow-hidden bg-page text-txt select-none',
      )}
    >
      {/* La barra lateral, en chiquito: el logo y lo activo en tu color. */}
      <div className="w-[46%] shrink-0 space-y-1 border-r border-hairline p-2.5">
        <div className="flex h-7 items-center gap-2 px-1.5 pb-1">
          <LogoConNombre
            tam={18}
            identidad={{ ...borrador, nombre: borrador.nombre.trim() || DE_FABRICA.nombre }}
            claseNombre="min-w-0 truncate text-[13px] font-bold tracking-[-0.02em]"
          />
        </div>
        <div className="flex h-7 items-center gap-2 rounded-[7px] bg-accent px-2 text-[12px] font-semibold text-accent-fg">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
          Bandeja
          <span className="tabular ml-auto text-[11px]">3</span>
        </div>
        <div className="flex h-7 items-center gap-2 px-2 text-[12px] text-txt">
          <Zap className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} />
          Automatizaciones
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5 p-2.5">
        <div className="space-y-2 rounded-[12px] border border-hairline bg-card p-2.5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted">{modo === 'claro' ? 'Claro' : 'Oscuro'}</span>
            <span className="rounded-full bg-accent-soft px-2 py-px text-[11px] font-semibold text-accent-ink">Activa</span>
          </div>
          <p className="ml-auto w-fit max-w-[92%] rounded-[14px] bg-accent px-2.5 py-1.5 text-[12px] text-accent-fg">
            ¡Claro! Aquí va el link 🙌
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-accent px-3 text-[12px] font-semibold text-accent-fg">
            Guardar
          </span>
          <span className="text-[12px] font-medium text-accent">Ver el flujo</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// El logo: se normaliza en el navegador a un PNG cuadrado y ligero
// ---------------------------------------------------------------------------

async function preparaLogo(f: File): Promise<{ png: string; completo: boolean }> {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) throw new Error('Sube un PNG, JPG, WebP o SVG');
  if (f.size > 8 * 1024 * 1024) throw new Error('Esa imagen pesa más de 8 MB');

  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error('No se pudo leer esa imagen');
    }
    // Un SVG sin tamaño propio se dibuja cuadrado.
    const w = img.naturalWidth || LOGO_LADO;
    const h = img.naturalHeight || LOGO_LADO;
    // Si las cuatro esquinas son opacas, el logo trae su propio fondo: ocupa el cuadro entero.
    const completo = esquinasOpacas(img);
    for (const lado of [LOGO_LADO, 192, 128]) {
      const png = pinta(img, w, h, lado, completo);
      if (png.length <= LOGO_MAX) return { png, completo };
    }
    throw new Error('Ese logo queda muy pesado. Prueba con uno más sencillo.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function esquinasOpacas(img: HTMLImageElement): boolean {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 16;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, 16, 16);
  const alfa = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
  return [alfa(0, 0), alfa(15, 0), alfa(0, 15), alfa(15, 15)].every((a) => a > 250);
}

/** Con fondo propio se recorta al cuadro; si no, cabe entero con aire transparente. */
function pinta(img: HTMLImageElement, w: number, h: number, lado: number, completo: boolean): string {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen');
  ctx.imageSmoothingQuality = 'high';
  const escala = completo ? Math.max(lado / w, lado / h) : Math.min(lado / w, lado / h);
  const dw = w * escala;
  const dh = h * escala;
  ctx.drawImage(img, (lado - dw) / 2, (lado - dh) / 2, dw, dh);
  return lienzo.toDataURL('image/png');
}

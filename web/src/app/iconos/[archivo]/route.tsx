import { ImageResponse } from 'next/og';
import { leerIdentidad, leerLogo } from '@/lib/identidad/servidor';
import { coloresDe, svgBurbuja } from '@/lib/identidad/tipos';

export const runtime = 'nodejs';
// Cambian cuando se guarda la marca, no al construir.
export const dynamic = 'force-dynamic';

/**
 * Los iconos del panel (favicon, la app del celular, los avisos), pintados con
 * la identidad de Ajustes › Marca: un cuadro de tu color con tu logo encima, o
 * la burbuja de Chatty. Se llaman igual que cuando eran archivos de
 * public/iconos, así el manifest, el service worker y los iPhone que ya
 * instalaron la app no se enteran del cambio.
 *
 * Los de navegador van redondeados; los de iOS y Android, a sangre, porque cada
 * sistema les pone su máscara. El maskable deja el logo dentro de la zona
 * segura (el círculo del 80 %).
 */
const ICONOS: Record<string, { lado: number; redondo: boolean; fraccion: number }> = {
  'favicon-32.png': { lado: 32, redondo: true, fraccion: 0.76 },
  'icono-192.png': { lado: 192, redondo: true, fraccion: 0.74 },
  'icono-512.png': { lado: 512, redondo: true, fraccion: 0.74 },
  'apple-touch-icon.png': { lado: 180, redondo: false, fraccion: 0.7 },
  'icono-maskable-512.png': { lado: 512, redondo: false, fraccion: 0.54 },
};

// Cinco minutos en el navegador; al guardar la marca, el `?v=` de la metadata pide uno nuevo.
const CACHE = 'public, max-age=300, stale-while-revalidate=86400';

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;

  // El logo tal cual se subió: lo pintan la barra, el login y la vista previa.
  if (archivo === 'logo.png') {
    const logo = await leerLogo();
    if (!logo) return new Response('Sin logo', { status: 404 });
    const png = new Uint8Array(Buffer.from(logo.slice(logo.indexOf(',') + 1), 'base64'));
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE } });
  }

  const forma = ICONOS[archivo];
  if (!forma) return new Response('No existe', { status: 404 });

  const identidad = await leerIdentidad();
  const { marca, marcaFg } = coloresDe(identidad.acento);
  const logo = identidad.logo ? await leerLogo() : null;
  const completo = Boolean(logo) && identidad.logoCompleto;
  const src = logo ?? `data:image/svg+xml;base64,${Buffer.from(svgBurbuja(marcaFg)).toString('base64')}`;
  const tam = completo ? forma.lado : Math.round(forma.lado * forma.fraccion);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: marca,
          borderRadius: forma.redondo ? Math.round(forma.lado * 0.2237) : 0,
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={tam} height={tam} style={{ objectFit: completo ? 'cover' : 'contain' }} />
      </div>
    ),
    { width: forma.lado, height: forma.lado, headers: { 'Cache-Control': CACHE } },
  );
}

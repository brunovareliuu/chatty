import type { Metadata } from 'next';
import { MARCA, SITE_DOMINIO, SITE_URL } from '@/lib/marca';

// ---------------------------------------------------------------------------
// EDITA ESTO antes de publicar la política y de mandar tu app de Meta a
// revisión: el correo donde atiendes lo de privacidad (Meta revisa que la
// política diga cómo contactarte) y la fecha de la versión que publicas.
// El nombre y el sitio salen solos de `lib/marca.ts`.
// ---------------------------------------------------------------------------
const CORREO_PRIVACIDAD = 'privacidad@example.com';
const ULTIMA_ACTUALIZACION = '24 de septiembre de 2026';

export const metadata: Metadata = {
  title: `Política de privacidad · ${MARCA.nombre}`,
  description: `Qué datos guarda el panel de ${MARCA.nombre}, para qué y cómo borrarlos.`,
};

/**
 * Página pública. Meta exige una URL de política de privacidad (y una de
 * instrucciones para borrar datos) para pasar la app a modo Activo: las dos
 * pueden ser esta. La firma quien opera el despliegue, no los autores de
 * Chatty, y describe lo que el código de verdad guarda; si le agregas algo al
 * panel que guarde otros datos, agrégalo aquí también.
 */
export default function PrivacidadPage() {
  // Sin sitio configurado, el pie no enlaza a un dominio de ejemplo.
  const tieneSitio = Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  const correo = (
    <a href={`mailto:${CORREO_PRIVACIDAD}`} className="font-medium text-accent">
      {CORREO_PRIVACIDAD}
    </a>
  );

  return (
    <main className="min-h-dvh bg-bg px-5 py-12 text-txt">
      <article className="mx-auto max-w-[640px] space-y-8 text-[15px] leading-relaxed">
        <header className="space-y-2">
          <p className="text-[12px] font-semibold tracking-[0.4px] text-muted uppercase">{MARCA.nombre}</p>
          <h1 className="text-[28px] font-bold tracking-[-0.6px]">Política de privacidad</h1>
          <p className="text-muted">Última actualización: {ULTIMA_ACTUALIZACION}.</p>
        </header>

        <Section title="Quién es responsable">
          <p>
            {MARCA.nombre} usa un panel privado para atender los mensajes directos y los
            comentarios de su cuenta profesional de Instagram. El panel es una instalación de
            Chatty, un programa de código abierto, que {MARCA.nombre} opera con su propio
            proyecto de Google Cloud y su propia app de Meta. Los datos no les llegan a los
            autores de Chatty ni a otras instalaciones. No es un servicio abierto al público.
          </p>
        </Section>

        <Section title="Qué datos guarda">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Los mensajes directos que recibe y envía la cuenta conectada, y los comentarios que
              activan una respuesta automática.
            </li>
            <li>
              De quien escribe o comenta: su nombre, usuario y foto de perfil públicos, el
              identificador que Instagram le asigna para esta cuenta, si la sigue y, si llegó por
              un anuncio, cuál.
            </li>
            <li>
              Lo que la persona contesta dentro de una conversación automatizada (por ejemplo, un
              correo o su ciudad, si se lo preguntan), y las etiquetas y notas que el negocio le
              pone para atenderla.
            </li>
            <li>
              El número de seguidores de la cuenta conectada, para avisarle al negocio cuando cruza
              una cifra redonda.
            </li>
            <li>
              El token de acceso de Instagram, cifrado, que permite responder en nombre de la cuenta.
            </li>
          </ul>
        </Section>

        <Section title="Para qué se usan">
          <p>
            Únicamente para mostrar la bandeja de entrada, contestar mensajes, correr las
            respuestas automáticas que configura el negocio y avisarle en su celular cuando llega
            algo. No se venden ni se comparten con terceros
            para su publicidad.
          </p>
        </Section>

        <Section title="Quién más los procesa">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Meta</strong>: los mensajes y comentarios llegan y salen por la API de
              Instagram.
            </li>
            <li>
              <strong>Google Cloud (Firebase)</strong>: aloja el panel y la base de datos.
            </li>
            <li>
              <strong>Anthropic</strong>, solo si el negocio usa el asistente con IA: recibe sus
              instrucciones y los datos de sus propias publicaciones y automatizaciones. Tus
              mensajes directos no se le mandan.
            </li>
            <li>
              Los avisos al celular del negocio pueden incluir el inicio de un mensaje. Viajan
              cifrados por el servicio de notificaciones de su navegador (Apple, Google o Mozilla),
              que no puede leerlos.
            </li>
          </ul>
        </Section>

        <Section title="Dónde se guardan y por cuánto tiempo">
          <p>
            En una base de datos de Google Cloud (Firestore) del proyecto de {MARCA.nombre}. Las
            conversaciones y los contactos se conservan hasta que el negocio los borra: desconectar
            la cuenta de Instagram borra el token de acceso, no el historial.
          </p>
        </Section>

        <Section title="Cómo borrar tus datos">
          <p>
            Si escribiste o comentaste en la cuenta de {MARCA.nombre} y quieres que se borren tus
            mensajes y tu contacto, escribe a {correo} o manda un mensaje directo a la cuenta
            pidiéndolo. Se borran de la base de datos en un plazo máximo de 30 días y se te
            confirma por el mismo medio.
          </p>
          <p>
            Si administras la cuenta conectada, al desconectarla desde <em>Ajustes</em> se borra
            el token de acceso de inmediato. También puedes quitarle el acceso desde Instagram, en{' '}
            <em>Configuración → Apps y sitios web</em>.
          </p>
        </Section>

        <Section title="Contacto">
          <p>Para cualquier duda sobre esta política: {correo}.</p>
        </Section>

        {tieneSitio && (
          <footer className="border-t border-border pt-6 text-[13px] text-muted">
            <a href={SITE_URL} className="font-medium text-accent">
              {SITE_DOMINIO}
            </a>
          </footer>
        )}
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[17px] font-semibold tracking-[-0.2px]">{title}</h2>
      {children}
    </section>
  );
}

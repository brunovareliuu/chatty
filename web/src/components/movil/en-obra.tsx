'use client';

import { Hammer, Monitor } from 'lucide-react';
import { Pantalla } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaEnlace, IconoFila } from '@/components/movil/ui/lista';

/**
 * El relleno de una pantalla que todavía no tiene su versión de celular.
 *
 * No es un «404 bonito»: lleva al panel de escritorio, que sí la tiene. Así la
 * app nunca es un callejón sin salida mientras se termina de armar.
 */
export function EnObra({
  titulo,
  descripcion,
  escritorio,
}: {
  titulo: string;
  descripcion?: string;
  /** La misma pantalla en el panel grande. */
  escritorio: string;
}) {
  return (
    <Pantalla titulo={titulo} descripcion={descripcion} atras={{ etiqueta: 'Atrás' }}>
      <Seccion pie="Mientras tanto, el panel de escritorio abre con tu misma sesión.">
        <Fila
          izquierda={<IconoFila icon={Hammer} tono="bg-warn" />}
          titulo="Esta pantalla se está armando"
          subtitulo="Le falta su versión de celular."
        />
        <FilaEnlace
          href={escritorio}
          izquierda={<IconoFila icon={Monitor} tono="bg-muted" />}
          titulo="Abrirla en el panel grande"
          ultima
        />
      </Seccion>
    </Pantalla>
  );
}

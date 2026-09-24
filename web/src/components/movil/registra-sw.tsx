'use client';

import { useEffect } from 'react';
import { registrarSw } from '@/lib/push/cliente';

/**
 * Registra el service worker de los avisos, sin pintar nada. La invitación a
 * activarlos vive en la pantalla Hoy y en Ajustes: en una app, un letrero
 * pegado arriba de todo se siente a banner de página web.
 */
export function RegistraSw() {
  useEffect(() => {
    void registrarSw();
  }, []);
  return null;
}

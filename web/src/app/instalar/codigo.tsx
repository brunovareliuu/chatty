'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Un comando o un valor listo para copiar. */
export function Codigo({ children }: { children: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(children);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso para el portapapeles: el texto sigue ahí para copiarlo a mano.
    }
  }

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-card border border-border bg-bg px-4 py-3 pr-12 font-mono text-[12.5px] leading-relaxed text-txt">
        {children}
      </pre>
      <button
        type="button"
        onClick={copiar}
        aria-label={copiado ? 'Copiado' : 'Copiar'}
        className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-txt"
      >
        {copiado ? <Check className="h-4 w-4 text-pos" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

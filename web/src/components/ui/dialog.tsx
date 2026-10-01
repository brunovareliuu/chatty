'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hoja al centro, como las de macOS: esquinas de 20 px, sombra que flota y un
 * fondo que oscurece poco. Entra subiendo apenas y creciendo desde 96 %.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/60" />
        <BaseDialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[86dvh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-float bg-bg shadow-float outline-none',
            'transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[starting-style]:translate-y-[calc(-50%+8px)] data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0',
            size === 'lg' ? 'max-w-[720px]' : 'max-w-[520px]',
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-5">
            <div className="min-w-0 space-y-1">
              <BaseDialog.Title className="text-[19px] leading-tight font-semibold tracking-[-0.018em]">
                {title}
              </BaseDialog.Title>
              {description && (
                <BaseDialog.Description className="text-[13.5px] leading-snug text-muted">
                  {description}
                </BaseDialog.Description>
              )}
            </div>
            <BaseDialog.Close
              className="-mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fill text-muted transition-colors hover:bg-fill-strong hover:text-txt"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </BaseDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

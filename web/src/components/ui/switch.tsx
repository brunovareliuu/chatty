'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      // Base UI lo pinta como <span>: sin inline-flex el alto y el ancho no
      // aplican y el riel desaparece (solo se veía la bolita blanca).
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        checked ? 'bg-accent' : 'bg-muted/30',
        className,
      )}
    >
      <BaseSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 data-[checked]:translate-x-[18px]" />
    </BaseSwitch.Root>
  );
}

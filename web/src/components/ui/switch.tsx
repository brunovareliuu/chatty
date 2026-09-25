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
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-surface-2',
        className,
      )}
    >
      <BaseSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[checked]:translate-x-[18px]" />
    </BaseSwitch.Root>
  );
}

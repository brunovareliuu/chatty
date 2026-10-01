'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronsUpDown, Plus, type LucideIcon } from 'lucide-react';
import { useAccounts } from '@/lib/client/accounts-context';
import { Avatar } from '@/components/ui/avatar';
import { Punto } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IgAccount } from '@/lib/types';

/** Una línea extra del menú de la cuenta (tema, cerrar sesión…). */
export type AccionCuenta = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** `neg` pinta la línea de rojo al pasar encima: para lo que saca de la sesión. */
  tono?: 'neg';
};

/** Quién está dentro del panel, para encabezar las acciones del menú. */
export type UsuarioCuenta = { nombre: string; detalle: string; foto?: string | null };

type Props = {
  /** Hacia dónde abre el menú: hacia arriba cuando vive al pie de la barra lateral. */
  lado?: 'top' | 'bottom';
  usuario?: UsuarioCuenta;
  acciones?: AccionCuenta[];
};

export function AccountSwitcher(props: Props) {
  const { accounts, account, setAccountId, loading } = useAccounts();
  return (
    <AccountSwitcherVista
      accounts={accounts}
      account={account}
      onElegir={setAccountId}
      loading={loading}
      {...props}
    />
  );
}

const claseItem =
  'flex cursor-default items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] outline-none select-none data-[highlighted]:bg-fill';

/**
 * La cuenta de Instagram con la que trabaja el panel, sin ganchos: la pinta
 * igual la barra lateral y cualquier vista con datos de ejemplo.
 */
export function AccountSwitcherVista({
  accounts,
  account,
  onElegir,
  loading,
  lado = 'bottom',
  usuario,
  acciones,
  abiertoAlInicio,
}: Props & {
  accounts: IgAccount[];
  account: IgAccount | null;
  onElegir: (id: string) => void;
  loading: boolean;
  abiertoAlInicio?: boolean;
}) {
  if (loading) {
    return <div className="h-[44px] animate-pulse rounded-[10px] bg-fill-soft" />;
  }

  // Sin cuenta y sin nada más que ofrecer en el menú, basta con el enlace.
  if (!account && !acciones?.length) {
    return (
      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" />
        Conectar Instagram
      </Link>
    );
  }

  return (
    <Menu.Root defaultOpen={abiertoAlInicio}>
      <Menu.Trigger className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-fill-soft data-[popup-open]:bg-fill-soft">
        {account ? (
          <>
            <Avatar src={account.profilePictureUrl} name={account.username} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] leading-tight font-semibold">@{account.username}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] leading-tight text-faint">
                <Punto tone={account.needsReconnect ? 'warn' : 'pos'} />
                {account.needsReconnect ? 'Necesita reconexión' : 'Conectada'}
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fill text-muted">
              <Plus className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted">Conectar Instagram</span>
          </>
        )}
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-faint" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side={lado} sideOffset={8} align="start" className="z-50">
          <Menu.Popup className="flotante min-w-[236px] p-1.5 outline-none">
            {accounts.map((a) => (
              <Menu.Item key={a.id} onClick={() => onElegir(a.id)} className={claseItem}>
                <Avatar src={a.profilePictureUrl} name={a.username} size={22} />
                <span className="min-w-0 flex-1 truncate font-medium">@{a.username}</span>
                {a.id === account?.id && <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.4} />}
              </Menu.Item>
            ))}

            <Menu.Item render={<Link href="/settings" />} className={cn(claseItem, 'text-muted data-[highlighted]:text-txt')}>
              <span className="grid w-[22px] shrink-0 place-items-center">
                <Plus className="h-4 w-4" />
              </span>
              {account ? 'Conectar otra cuenta' : 'Conectar Instagram'}
            </Menu.Item>

            {(usuario || acciones?.length) && <div className="mx-2 my-1.5 h-px bg-hairline" />}

            {usuario && (
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <Avatar src={usuario.foto} name={usuario.nombre} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] leading-tight font-semibold">{usuario.nombre}</p>
                  <p className="truncate text-[11.5px] leading-tight text-faint">{usuario.detalle}</p>
                </div>
              </div>
            )}

            {acciones?.map(({ label, icon: Icon, onClick, tono }) => (
              <Menu.Item
                key={label}
                onClick={onClick}
                className={cn(claseItem, tono === 'neg' && 'data-[highlighted]:text-neg')}
              >
                <span className="grid w-[22px] shrink-0 place-items-center">
                  <Icon className="h-4 w-4 text-muted" strokeWidth={1.8} />
                </span>
                {label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronsUpDown, Plus, TriangleAlert } from 'lucide-react';
import { useAccounts } from '@/lib/client/accounts-context';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function AccountSwitcher() {
  const { accounts, account, setAccountId, loading } = useAccounts();

  if (loading) {
    return <div className="h-[46px] animate-pulse rounded-xl bg-surface-2" />;
  }

  if (!account) {
    return (
      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" />
        Conectar Instagram
      </Link>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-2 text-left transition-colors hover:bg-border">
        <Avatar src={account.profilePictureUrl} name={account.username} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">@{account.username}</p>
          <p className="truncate text-[11px] text-faint">
            {account.needsReconnect ? 'Necesita reconexión' : 'Conectada'}
          </p>
        </div>
        {account.needsReconnect ? (
          <TriangleAlert className="h-4 w-4 shrink-0 text-warn" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-faint" />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup className="min-w-[224px] rounded-[18px] border border-border bg-surface p-1.5 shadow-xl shadow-black/10 outline-none">
            {accounts.map((a) => (
              <Menu.Item
                key={a.id}
                onClick={() => setAccountId(a.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] outline-none',
                  'data-[highlighted]:bg-surface-2',
                )}
              >
                <Avatar src={a.profilePictureUrl} name={a.username} size={24} />
                <span className="min-w-0 flex-1 truncate font-medium">@{a.username}</span>
                {a.id === account.id && <Check className="h-3.5 w-3.5 text-accent" />}
              </Menu.Item>
            ))}

            <div className="my-1.5 h-px bg-border" />

            <Menu.Item
              render={<Link href="/settings" />}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-muted outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-txt"
            >
              <Plus className="h-4 w-4" />
              Conectar otra cuenta
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

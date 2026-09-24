'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IgAccount } from '@/lib/types';

const STORAGE_KEY = 'chatty:selected-account';

type AccountsValue = {
  accounts: IgAccount[];
  account: IgAccount | null;
  accountId: string | null;
  setAccountId: (id: string) => void;
  loading: boolean;
};

const AccountsContext = createContext<AccountsValue | null>(null);

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<IgAccount[]>([]);
  const [loading, setLoading] = useState(true);
  // Inicializador perezoso en vez de un efecto: en el servidor da null y en el
  // navegador la última cuenta usada, sin provocar un render extra.
  const [selected, setSelected] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // Modo incógnito o storage bloqueado: se elige la primera cuenta y ya.
      return null;
    }
  });

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'accounts')),
      (snap) => {
        setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as IgAccount));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  const setAccountId = (id: string) => {
    setSelected(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* sin persistencia, pero funciona en la sesión */
    }
  };

  const value = useMemo<AccountsValue>(() => {
    const account =
      accounts.find((a) => a.id === selected) ?? accounts.find((a) => a.active) ?? accounts[0] ?? null;
    return { accounts, account, accountId: account?.id ?? null, setAccountId, loading };
  }, [accounts, selected, loading]);

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
}

export function useAccounts(): AccountsValue {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error('useAccounts debe usarse dentro de <AccountsProvider>');
  return ctx;
}

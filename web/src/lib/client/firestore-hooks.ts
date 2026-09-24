'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Automation, Contact, Conversation, Flow, Message } from '@/lib/types';

type Result<T> = { data: T[]; loading: boolean; error: string | null };

/**
 * Suscripción en vivo a una colección.
 *
 * El estado guarda a qué consulta pertenecen los datos (`key`). Así "cargando"
 * se deduce en el render comparando claves, en vez de escribir estado dentro
 * del efecto — que provocaría renders en cascada al cambiar de cuenta.
 */
function useCollection<T>(path: string | null, constraints: QueryConstraint[], key: string): Result<T> {
  const [snapshot, setSnapshot] = useState<{ key: string | null; data: T[]; error: string | null }>({
    key: null,
    data: [],
    error: null,
  });

  useEffect(() => {
    if (!path) return;

    return onSnapshot(
      query(collection(db, path), ...constraints),
      (snap) => {
        setSnapshot({
          key,
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          error: null,
        });
      },
      (err) => setSnapshot({ key, data: [], error: err.message }),
    );
    // `key` resume path + constraints; las constraints se reconstruyen cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path]);

  const fresh = snapshot.key === key;
  return {
    data: fresh ? snapshot.data : [],
    loading: path !== null && !fresh,
    error: fresh ? snapshot.error : null,
  };
}

export function useConversations(accountId: string | null, status: 'open' | 'closed' | 'all' = 'open') {
  const constraints = useMemo(() => {
    const list: QueryConstraint[] = [orderBy('lastMessageAt', 'desc'), fsLimit(100)];
    if (status !== 'all') list.unshift(where('status', '==', status));
    return list;
  }, [status]);

  return useCollection<Conversation>(
    accountId ? `accounts/${accountId}/conversations` : null,
    constraints,
    `conversations:${accountId}:${status}`,
  );
}

export function useMessages(accountId: string | null, conversationId: string | null) {
  const constraints = useMemo(() => [orderBy('timestamp', 'asc'), fsLimit(200)], []);
  return useCollection<Message>(
    accountId && conversationId
      ? `accounts/${accountId}/conversations/${conversationId}/messages`
      : null,
    constraints,
    `messages:${accountId}:${conversationId}`,
  );
}

export function useAutomations(accountId: string | null) {
  const constraints = useMemo(() => [orderBy('priority', 'asc')], []);
  return useCollection<Automation>(
    accountId ? `accounts/${accountId}/automations` : null,
    constraints,
    `automations:${accountId}`,
  );
}

export function useFlows(accountId: string | null) {
  const constraints = useMemo(() => [orderBy('updatedAt', 'desc')], []);
  return useCollection<Flow>(
    accountId ? `accounts/${accountId}/flows` : null,
    constraints,
    `flows:${accountId}`,
  );
}

export function useContacts(accountId: string | null) {
  const constraints = useMemo(() => [orderBy('lastMessageAt', 'desc'), fsLimit(200)], []);
  return useCollection<Contact>(
    accountId ? `accounts/${accountId}/contacts` : null,
    constraints,
    `contacts:${accountId}`,
  );
}

export function useDoc<T>(path: string | null): { data: T | null; loading: boolean } {
  const [snapshot, setSnapshot] = useState<{ key: string | null; data: T | null }>({
    key: null,
    data: null,
  });

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      (snap) => setSnapshot({ key: path, data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null }),
      () => setSnapshot({ key: path, data: null }),
    );
  }, [path]);

  const fresh = snapshot.key === path;
  return { data: fresh ? snapshot.data : null, loading: path !== null && !fresh };
}

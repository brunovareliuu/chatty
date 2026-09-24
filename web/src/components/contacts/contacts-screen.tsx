'use client';

import { useMemo, useState } from 'react';
import { AtSign, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useContacts } from '@/lib/client/firestore-hooks';
import { setContactNotes, setContactTags } from '@/lib/client/mutations';
import type { Contact } from '@/lib/types';
import { relativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Input, Field, Textarea } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { PageHeader } from '@/components/shell/page-header';
import { Dialog } from '@/components/ui/dialog';

export function ContactsScreen() {
  const { account } = useAccounts();
  const { data: contacts, loading } = useContacts(account?.id ?? null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(
      (c) =>
        c.username?.toLowerCase().includes(term) ||
        c.name?.toLowerCase().includes(term) ||
        c.tags.some((t) => t.toLowerCase().includes(term)),
    );
  }, [contacts, search]);

  if (!account) {
    return (
      <Empty
        icon={Users}
        title="Conecta una cuenta primero"
        description="Aquí aparecerá todo el que te haya escrito, con sus etiquetas y datos capturados."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Contactos"
        description={`${contacts.length} ${contacts.length === 1 ? 'persona' : 'personas'} te han escrito.`}
        action={
          <div className="relative w-full md:w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o etiqueta"
              aria-label="Buscar contactos"
              className="pl-9 text-[16px] md:text-[14px]"
            />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        {loading && (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-card bg-surface-2/60" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Empty
            icon={Users}
            title={search ? 'Nada coincide' : 'Todavía no hay contactos'}
            description={
              search
                ? 'Prueba con otro nombre o etiqueta.'
                : 'En cuanto alguien te escriba por Instagram aparecerá aquí.'
            }
          />
        )}

        <div className="space-y-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors hover:bg-surface"
            >
              <Avatar src={c.profilePic} name={c.name ?? c.username} size={36} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-tight">
                  {c.name ?? (c.username ? `@${c.username}` : 'Sin nombre')}
                </p>
                {c.username && c.name && (
                  <p className="flex items-center gap-0.5 text-[12px] text-muted">
                    <AtSign className="h-3 w-3" />
                    {c.username}
                  </p>
                )}
                {c.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                    {c.tags.slice(0, 2).map((t) => (
                      <Badge key={t} tone="accent">
                        {t}
                      </Badge>
                    ))}
                    {c.tags.length > 2 && <Badge>+{c.tags.length - 2}</Badge>}
                  </div>
                )}
              </div>

              <div className="hidden max-w-[280px] flex-wrap justify-end gap-1 md:flex">
                {c.tags.slice(0, 3).map((t) => (
                  <Badge key={t} tone="accent">
                    {t}
                  </Badge>
                ))}
                {c.tags.length > 3 && <Badge>+{c.tags.length - 3}</Badge>}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-3">
                {c.followsBusiness && <Badge tone="pos">Te sigue</Badge>}
                <span className="text-right text-[11px] text-faint tabular md:w-14">
                  {relativeTime(c.lastMessageAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <ContactDialog
          accountId={account.id}
          contact={contacts.find((c) => c.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ContactDialog({
  accountId,
  contact,
  onClose,
}: {
  accountId: string;
  contact: Contact;
  onClose: () => void;
}) {
  const [tags, setTags] = useState(contact.tags);
  const [notes, setNotes] = useState(contact.notes ?? '');
  const fields = Object.entries(contact.fields);

  async function persist() {
    try {
      await Promise.all([
        setContactTags(accountId, contact.id, tags),
        setContactNotes(accountId, contact.id, notes),
      ]);
      toast.success('Contacto actualizado');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={contact.name ?? (contact.username ? `@${contact.username}` : 'Contacto')}
      description={contact.username && contact.name ? `@${contact.username}` : undefined}
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-[14px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-txt"
          >
            Cancelar
          </button>
          <button
            onClick={persist}
            className="h-10 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-card bg-surface p-3">
          <Avatar src={contact.profilePic} name={contact.name ?? contact.username} size={48} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {contact.followsBusiness && <Badge tone="pos">Te sigue</Badge>}
              {contact.businessFollows && <Badge>Lo sigues</Badge>}
              {contact.isVerifiedUser && <Badge tone="accent">Verificado</Badge>}
            </div>
            <p className="text-[12px] text-faint">
              Primer mensaje {relativeTime(contact.firstSeenAt)} · último{' '}
              {relativeTime(contact.lastMessageAt)}
            </p>
          </div>
        </div>

        <Field label="Etiquetas">
          <TagInput values={tags} onChange={setTags} placeholder="cliente, interesado…" />
        </Field>

        {fields.length > 0 && (
          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-[0.4px] text-muted uppercase">
              Datos capturados
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-xl bg-surface">
              {fields.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span className="text-[13px] text-muted">{k}</span>
                  <span className="min-w-0 truncate text-[13px] font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field label="Notas internas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Lo que necesites recordar de esta persona"
            className="text-[16px] md:text-[14px]"
          />
        </Field>
      </div>
    </Dialog>
  );
}

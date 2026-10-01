'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useContacts } from '@/lib/client/firestore-hooks';
import { setContactNotes, setContactTags } from '@/lib/client/mutations';
import type { Contact } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge, Punto } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Input, Field, Textarea } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { PageHeader } from '@/components/shell/page-header';
import { Dialog } from '@/components/ui/dialog';

export function ContactsScreen() {
  const { account } = useAccounts();
  const { data: contacts, loading } = useContacts(account?.id ?? null);

  if (!account) {
    return (
      <Empty
        icon={Users}
        title="Conecta una cuenta primero"
        description="Aquí aparecerá todo el que te haya escrito, con sus etiquetas y datos capturados."
      />
    );
  }

  return <VistaContactos accountId={account.id} contacts={contacts} loading={loading} />;
}

/** «Te sigue» con su punto verde: el verde solo como estado, chico. */
function TeSigue() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap text-muted">
      <Punto tone="pos" />
      Te sigue
    </span>
  );
}

/**
 * Contactos sin datos propios: la lista en una tarjeta y la hoja de cada
 * persona. La usan `ContactsScreen` y cualquier vista con contactos de ejemplo.
 */
export function VistaContactos({
  accountId,
  contacts,
  loading,
}: {
  accountId: string;
  contacts: Contact[];
  loading: boolean;
}) {
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

  return (
    <>
      <PageHeader
        title="Contactos"
        description={`${contacts.length} ${contacts.length === 1 ? 'persona' : 'personas'} te han escrito.`}
        action={
          // En celular, todo el ancho de la columna (la pantalla menos el margen de px-pagina).
          <div className="relative w-[calc(100vw-2rem)] md:w-[290px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-[15px] w-[15px] -translate-y-1/2 text-faint" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o etiqueta"
              aria-label="Buscar contactos"
              className="h-10 pl-9 text-[16px] md:h-9 md:text-[13.5px]"
            />
          </div>
        }
      />

      <div className="px-pagina min-h-0 flex-1 overflow-y-auto pb-6 md:pb-10">
        {loading && (
          <div className="tarjeta p-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-[60px] items-center gap-3 px-2.5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-fill-soft" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 animate-pulse rounded-full bg-fill-soft" />
                  <div className="h-3 w-1/6 animate-pulse rounded-full bg-fill-soft" />
                </div>
              </div>
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

        {filtered.length > 0 && (
          <div className="tarjeta p-1.5">
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={cn(
                  'relative flex min-h-[60px] w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-fill-soft/70 active:bg-fill-soft',
                  // Filo entre filas desde el texto (10 + 40 + 12 px), como en Contactos de iOS.
                  i > 0 &&
                    'before:absolute before:top-0 before:right-2.5 before:left-[62px] before:h-px before:bg-hairline hover:before:opacity-0 [&:hover+button]:before:opacity-0',
                )}
              >
                <Avatar src={c.profilePic} name={c.name ?? c.username} size={40} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] leading-tight font-semibold tracking-[-0.012em]">
                    {c.name ?? (c.username ? `@${c.username}` : 'Sin nombre')}
                  </p>
                  {c.username && c.name && (
                    <p className="mt-0.5 truncate text-[12.5px] text-faint">@{c.username}</p>
                  )}
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 md:hidden">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                      {c.tags.length > 2 && <Badge>+{c.tags.length - 2}</Badge>}
                    </div>
                  )}
                </div>

                <div className="hidden max-w-[300px] flex-wrap justify-end gap-1 md:flex">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                  {c.tags.length > 3 && <Badge>+{c.tags.length - 3}</Badge>}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-0">
                  {/* En escritorio el hueco se queda aunque no te siga: así las horas quedan en columna. */}
                  <span className={cn('flex md:w-[92px] md:justify-end', !c.followsBusiness && 'hidden md:flex')}>
                    {c.followsBusiness && <TeSigue />}
                  </span>
                  <span className="tabular text-right text-[12px] text-faint md:w-16">
                    {relativeTime(c.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ContactDialog
          accountId={accountId}
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
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={persist}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3.5 rounded-card bg-surface p-3.5">
          <Avatar src={contact.profilePic} name={contact.name ?? contact.username} size={48} />
          <div className="min-w-0 flex-1 space-y-1.5">
            {(contact.followsBusiness || contact.businessFollows || contact.isVerifiedUser) && (
              <div className="flex flex-wrap gap-1.5">
                {contact.followsBusiness && (
                  <Badge>
                    <Punto tone="pos" />
                    Te sigue
                  </Badge>
                )}
                {contact.businessFollows && <Badge>Lo sigues</Badge>}
                {contact.isVerifiedUser && <Badge tone="accent">Verificado</Badge>}
              </div>
            )}
            <p className="text-[12.5px] leading-snug text-muted">
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
            <p className="mb-1.5 px-1 text-[12px] font-medium tracking-[0.02em] text-muted uppercase">
              Datos capturados
            </p>
            <div className="divide-y divide-hairline overflow-hidden rounded-card bg-surface">
              {fields.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                  <span className="text-[13px] text-muted">{k}</span>
                  <span className="min-w-0 truncate text-[13px] font-medium">{typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}</span>
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

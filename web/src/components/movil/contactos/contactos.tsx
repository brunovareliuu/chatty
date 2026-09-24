'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/lib/client/accounts-context';
import { useContacts } from '@/lib/client/firestore-hooks';
import { setContactNotes, setContactTags } from '@/lib/client/mutations';
import type { Contact } from '@/lib/types';
import { relativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Pantalla, AccionBarra } from '@/components/movil/ui/pantalla';
import { Seccion, Fila, FilaBoton, FilaEnlace } from '@/components/movil/ui/lista';
import { Busqueda, Cargando, Vacio } from '@/components/movil/ui/controles';
import { Hoja } from '@/components/movil/ui/hoja';

/**
 * Contactos — todo el que te ha escrito, con su buscador. Tocar uno abre la
 * hoja de iOS con sus datos, sus etiquetas y las notas; se guarda con las
 * mismas funciones que el panel grande (`setContactTags`, `setContactNotes`).
 */
export function PantallaContactos() {
  const { account, loading: cargandoCuentas } = useAccounts();
  const { data: contactos, loading } = useContacts(account?.id ?? null);
  const [busqueda, setBusqueda] = useState('');
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const lista = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return contactos;
    return contactos.filter(
      (c) =>
        c.username?.toLowerCase().includes(termino) ||
        c.name?.toLowerCase().includes(termino) ||
        c.tags.some((t) => t.toLowerCase().includes(termino)),
    );
  }, [contactos, busqueda]);

  const abierto = contactos.find((c) => c.id === abiertoId) ?? null;

  return (
    <Pantalla
      titulo="Contactos"
      descripcion={
        contactos.length > 0
          ? `${contactos.length} ${contactos.length === 1 ? 'persona te ha escrito' : 'personas te han escrito'}.`
          : undefined
      }
      atras={{ href: '/m/bandeja', etiqueta: 'Bandeja' }}
      bajoBarra={
        <Busqueda valor={busqueda} onChange={setBusqueda} placeholder="Nombre, usuario o etiqueta" />
      }
      sinMargen
    >
      {!cargandoCuentas && !account && (
        <Vacio
          icon={Users}
          titulo="No hay cuenta conectada"
          detalle="Aquí aparece todo el que te haya escrito, con sus etiquetas y sus datos."
        />
      )}

      {account && (loading || cargandoCuentas) && <Cargando />}

      {account && !loading && lista.length === 0 && (
        <Vacio
          icon={Users}
          titulo={busqueda ? 'Nada coincide' : 'Todavía no hay contactos'}
          detalle={
            busqueda
              ? 'Prueba con otro nombre o etiqueta.'
              : 'En cuanto alguien te escriba por Instagram aparece aquí.'
          }
        />
      )}

      {account && !loading && lista.length > 0 && (
        <Seccion className="pt-0">
          {lista.map((c, i) => (
            <FilaBoton
              key={c.id}
              onClick={() => setAbiertoId(c.id)}
              izquierda={<Avatar src={c.profilePic} name={c.name ?? c.username} size={29} />}
              titulo={c.name ?? (c.username ? `@${c.username}` : 'Sin nombre')}
              subtitulo={<Resumen contacto={c} />}
              valor={<span className="shrink-0 text-[13px] text-muted">{relativeTime(c.lastMessageAt)}</span>}
              chevron
              ultima={i === lista.length - 1}
            />
          ))}
        </Seccion>
      )}

      {account && abierto && (
        <HojaContacto
          key={abierto.id}
          accountId={account.id}
          contacto={abierto}
          onCerrar={() => setAbiertoId(null)}
        />
      )}
    </Pantalla>
  );
}

/** La segunda línea: el usuario y, si las tiene, sus etiquetas. */
function Resumen({ contacto }: { contacto: Contact }) {
  const partes: string[] = [];
  if (contacto.username && contacto.name) partes.push(`@${contacto.username}`);
  if (contacto.tags.length > 0) partes.push(contacto.tags.join(' · '));
  if (partes.length === 0 && contacto.followsBusiness) partes.push('Te sigue');
  if (partes.length === 0) return null;

  return (
    <span className="mt-0.5 block truncate text-[13px] leading-[1.35] text-muted">
      {partes.join(' — ')}
    </span>
  );
}

function HojaContacto({
  accountId,
  contacto,
  onCerrar,
}: {
  accountId: string;
  contacto: Contact;
  onCerrar: () => void;
}) {
  const [etiquetas, setEtiquetas] = useState(contacto.tags);
  const [notas, setNotas] = useState(contacto.notes ?? '');
  const [guardando, setGuardando] = useState(false);
  const campos = Object.entries(contacto.fields ?? {});
  const nombre = contacto.name ?? (contacto.username ? `@${contacto.username}` : 'Contacto');

  async function guardar() {
    setGuardando(true);
    try {
      await Promise.all([
        setContactTags(accountId, contacto.id, etiquetas),
        setContactNotes(accountId, contacto.id, notas),
      ]);
      toast.success('Contacto actualizado');
      onCerrar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      abierta
      onCerrar={onCerrar}
      titulo={nombre}
      derecha={
        <AccionBarra fuerte onClick={guardar} disabled={guardando}>
          Guardar
        </AccionBarra>
      }
    >
      {/* La hoja ya trae 16 px de relleno; las secciones traen los suyos. */}
      <div className="-mx-4">
        <Seccion>
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar src={contacto.profilePic} name={nombre} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold">{nombre}</p>
              {contacto.username && (
                <p className="truncate text-[13px] text-muted">@{contacto.username}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {contacto.followsBusiness && <Pastilla>Te sigue</Pastilla>}
                {contacto.businessFollows && <Pastilla>Lo sigues</Pastilla>}
                {contacto.isVerifiedUser && <Pastilla>Verificado</Pastilla>}
              </div>
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Etiquetas" pie="Sirven para encontrarlo después y para segmentar.">
          <div className="px-4 py-3">
            <EditorEtiquetas valores={etiquetas} onChange={setEtiquetas} />
          </div>
        </Seccion>

        {campos.length > 0 && (
          <Seccion titulo="Datos capturados" pie="Lo que respondió dentro de una automatización.">
            {campos.map(([k, v], i) => (
              <Fila
                key={k}
                titulo={<span className="block truncate text-[17px] text-muted">{k}</span>}
                valor={
                  <span className="max-w-[55%] truncate text-[17px] font-medium text-txt">
                    {String(v)}
                  </span>
                }
                ultima={i === campos.length - 1}
              />
            ))}
          </Seccion>
        )}

        <Seccion titulo="Notas internas">
          <div className="px-4 py-3">
            {/* 16 px o más: con menos, Safari hace zoom al enfocar el campo. */}
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              placeholder="Lo que necesites recordar de esta persona"
              className="w-full resize-none bg-transparent text-[16px] leading-[1.4] text-txt outline-none placeholder:text-muted"
            />
          </div>
        </Seccion>

        <Seccion titulo="Historia" pie={`Primer mensaje ${relativeTime(contacto.firstSeenAt)} · último ${relativeTime(contacto.lastMessageAt)}.`}>
          <FilaEnlace
            href={`/m/bandeja/${contacto.id}`}
            izquierda={<MessageCircle className="h-[19px] w-[19px] text-accent" />}
            titulo="Abrir la conversación"
            ultima
          />
        </Seccion>
      </div>
    </Hoja>
  );
}

function Pastilla({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">
      {children}
    </span>
  );
}

/**
 * Las etiquetas: un campo donde Enter o coma confirman y cada etiqueta se
 * quita con su tache. Es el `TagInput` del panel, con los tamaños del dedo.
 */
function EditorEtiquetas({
  valores,
  onChange,
}: {
  valores: string[];
  onChange: (v: string[]) => void;
}) {
  const [borrador, setBorrador] = useState('');

  function confirma(crudo: string) {
    const nuevas = crudo
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !valores.includes(p));
    if (nuevas.length) onChange([...valores, ...nuevas]);
    setBorrador('');
  }

  return (
    <div>
      {valores.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {valores.map((v) => (
            <span
              key={v}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft pr-1.5 pl-3 text-[15px] font-medium text-accent"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(valores.filter((x) => x !== v))}
                aria-label={`Quitar ${v}`}
                className="grid h-6 w-6 place-items-center rounded-full active:opacity-50"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* 16 px o más: con menos, Safari hace zoom al enfocar el campo. */}
      <input
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            confirma(borrador);
          } else if (e.key === 'Backspace' && !borrador && valores.length) {
            onChange(valores.slice(0, -1));
          }
        }}
        onBlur={() => borrador && confirma(borrador)}
        placeholder="cliente, interesado…"
        className="h-9 w-full rounded-[10px] bg-surface-2 px-3 text-[16px] text-txt outline-none placeholder:text-muted"
      />
    </div>
  );
}

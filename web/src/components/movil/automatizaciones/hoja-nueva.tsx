'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createAutomation, emptyTrigger } from '@/lib/client/mutations';
import { FOLLOW_GATE_DEFAULTS } from '@/lib/engine/starter-flow';
import type { Trigger } from '@/lib/types';
import { PostPicker } from '@/components/automations/post-picker';
import { Hoja } from '@/components/movil/ui/hoja';
import { Seccion, Fila, FilaBoton } from '@/components/movil/ui/lista';
import { FilaCampo, FilaSelector, FilaTextoLargo } from '@/components/movil/ajustes/campos';
import { Switch } from '@/components/ui/switch';
import { OPCIONES_COINCIDENCIA, OPCIONES_DISPARADOR } from './etiquetas';

const MAX_PUBLICAS = 10;

/**
 * Nueva automatización, en una hoja que sube desde abajo. Son los mismos
 * campos del diálogo del escritorio (`automation-dialog.tsx`) y la misma
 * función de alta (`createAutomation`): lo único que cambia es la pintura —
 * aquí cada campo es una fila de iOS y nada baja de 17 px.
 *
 * Solo crea. Cambiar el disparador de una que ya existe sigue siendo cosa del
 * panel grande, que es donde también se edita el flujo.
 */
export function HojaNuevaAutomatizacion({
  accountId,
  prioridad,
  abierta,
  onCerrar,
  onCreada,
}: {
  accountId: string;
  /** Cuántas hay: la nueva se evalúa al final. */
  prioridad: number;
  abierta: boolean;
  onCerrar: () => void;
  onCreada: (id: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [disparador, setDisparador] = useState<Trigger>(() => emptyTrigger());
  const [primerMensaje, setPrimerMensaje] = useState(
    '¡Hola {{first_name}}! 👋 Gracias por escribir, ahora te comparto la información.',
  );
  const [tituloEnlace, setTituloEnlace] = useState('');
  const [urlEnlace, setUrlEnlace] = useState('');
  const [pedirSeguir, setPedirSeguir] = useState(false);
  const [textoSeguir, setTextoSeguir] = useState<string>(FOLLOW_GATE_DEFAULTS.text);
  const [botonSeguir, setBotonSeguir] = useState<string>(FOLLOW_GATE_DEFAULTS.buttonTitle);
  const [notificar, setNotificar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const pidePalabras = disparador.type !== 'first_message' && disparador.type !== 'default_reply';
  const esComentario = disparador.type === 'comment_keyword';
  const publicas = disparador.publicReplies ?? [];

  function cambia(parche: Partial<Trigger>) {
    setDisparador((t) => ({ ...t, ...parche }));
  }

  async function crear() {
    if (!nombre.trim()) {
      toast.error('Ponle un nombre a la automatización');
      return;
    }
    if (pidePalabras && disparador.matchType !== 'any' && disparador.keywords.length === 0) {
      toast.error('Agrega al menos una palabra clave');
      return;
    }
    const url = urlEnlace.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      toast.error('El enlace tiene que empezar con https://');
      return;
    }

    setGuardando(true);
    try {
      const id = await createAutomation(accountId, {
        name: nombre.trim(),
        trigger: {
          ...disparador,
          publicReplies: publicas.map((r) => r.trim()).filter(Boolean),
          publicReply: null,
        },
        priority: prioridad,
        starter: {
          message: primerMensaje,
          link: url ? { title: tituloEnlace.trim() || 'Ver enlace', url } : null,
          followGate: pedirSeguir ? { text: textoSeguir, buttonTitle: botonSeguir } : null,
        },
        notificar,
      });
      toast.success('Automatización creada');
      onCreada(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Nueva"
      alta
      derecha={
        <button
          type="button"
          onClick={crear}
          disabled={guardando}
          className="h-9 text-[17px] font-semibold text-accent active:opacity-50 disabled:opacity-30"
        >
          {guardando ? 'Creando…' : 'Crear'}
        </button>
      }
    >
      {/* Las secciones traen su propio margen de 16: aquí se le quita el de la hoja. */}
      <div className="-mx-4 pt-2">
        <Seccion>
          <FilaCampo
            etiqueta="Nombre"
            valor={nombre}
            onChange={setNombre}
            placeholder="Lista de precios"
            ultima
          />
        </Seccion>

        <Seccion
          titulo="Cuándo se dispara"
          pie={
            esComentario
              ? 'Sin elegir publicaciones aplica a todas las de la cuenta.'
              : undefined
          }
        >
          <FilaSelector
            etiqueta="Se dispara con"
            valor={disparador.type}
            onChange={(type) => cambia({ type })}
            opciones={OPCIONES_DISPARADOR.map((o) => ({ valor: o.valor, label: o.label }))}
            ultima={!pidePalabras}
          />
          {pidePalabras && (
            <FilaSelector
              etiqueta="Coincidencia"
              valor={disparador.matchType}
              onChange={(matchType) => cambia({ matchType })}
              opciones={OPCIONES_COINCIDENCIA}
              ultima={disparador.matchType === 'any'}
            />
          )}
          {pidePalabras && disparador.matchType !== 'any' && (
            <Palabras
              valores={disparador.keywords}
              onChange={(keywords) => cambia({ keywords })}
              regex={disparador.matchType === 'regex'}
            />
          )}
        </Seccion>

        {esComentario && (
          <section className="mb-8">
            <h2 className="px-8 pb-1.5 text-[13px] font-normal tracking-[0.03em] text-muted uppercase">
              Publicaciones
            </h2>
            <div className="px-4">
              <PostPicker
                accountId={accountId}
                values={disparador.postIds}
                onChange={(postIds) => cambia({ postIds })}
              />
            </div>
          </section>
        )}

        {esComentario && (
          <Seccion
            titulo="Responder también en público"
            pie="Opcional. Con varias, sale una al azar para no contestar siempre igual."
          >
            {publicas.map((r, i) => (
              <FilaCampo
                key={i}
                etiqueta={`Respuesta ${i + 1}`}
                apilado
                valor={r}
                onChange={(v) => cambia({ publicReplies: publicas.map((x, j) => (j === i ? v : x)) })}
                placeholder="¡Te acabo de mandar DM! 📩"
                derecha={
                  <button
                    type="button"
                    onClick={() => cambia({ publicReplies: publicas.filter((_, j) => j !== i) })}
                    className="grid h-9 w-9 shrink-0 place-items-center text-muted active:opacity-50"
                    aria-label={`Quitar la respuesta ${i + 1}`}
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                }
              />
            ))}
            {publicas.length < MAX_PUBLICAS ? (
              <FilaBoton
                onClick={() => cambia({ publicReplies: [...publicas, ''] })}
                titulo={
                  <span className="flex items-center gap-2 text-[17px] text-accent">
                    <Plus className="h-[17px] w-[17px]" strokeWidth={2.4} />
                    {publicas.length === 0 ? 'Agregar respuesta pública' : 'Agregar otra'}
                  </span>
                }
                ultima
              />
            ) : (
              <Fila titulo="Ya son diez, el máximo" ultima />
            )}
          </Seccion>
        )}

        <Seccion titulo="Qué contesta" pie="El resto de la conversación se arma en el panel grande.">
          <FilaTextoLargo
            etiqueta="Primer mensaje"
            valor={primerMensaje}
            onChange={setPrimerMensaje}
            placeholder="¡Hola {{first_name}}!"
          />
          <FilaCampo
            etiqueta="Botón"
            valor={tituloEnlace}
            onChange={(v) => setTituloEnlace(v.slice(0, 20))}
            placeholder="Ver la guía"
            maxLength={20}
          />
          <FilaCampo
            etiqueta="Enlace"
            valor={urlEnlace}
            onChange={setUrlEnlace}
            placeholder="https://…"
            tipo="url"
            inputMode="url"
            ultima
          />
        </Seccion>

        <Seccion pie="El mensaje solo sale cuando Instagram confirma que la persona ya te sigue.">
          <Fila
            titulo="Pedir que te siga antes"
            derecha={<Switch checked={pedirSeguir} onCheckedChange={setPedirSeguir} />}
            ultima={!pedirSeguir}
          />
          {pedirSeguir && (
            <>
              <FilaTextoLargo
                etiqueta="Mensaje para pedirlo"
                valor={textoSeguir}
                onChange={setTextoSeguir}
                filas={2}
              />
              <FilaCampo
                etiqueta="Botón"
                valor={botonSeguir}
                onChange={(v) => setBotonSeguir(v.slice(0, 20))}
                placeholder="Ya te sigo"
                maxLength={20}
                ultima
              />
            </>
          )}
        </Seccion>

        <Seccion pie="Un aviso con quién escribió y qué dijo. Se ajusta en Ajustes › Notificaciones.">
          <Fila
            titulo="Avisarme al celular"
            derecha={<Switch checked={notificar} onCheckedChange={setNotificar} />}
            ultima={!(pidePalabras && disparador.matchType !== 'regex' && disparador.matchType !== 'any')}
          />
          {pidePalabras && disparador.matchType !== 'regex' && disparador.matchType !== 'any' && (
            <Fila
              titulo="Distinguir mayúsculas y acentos"
              derecha={
                <Switch
                  checked={disparador.caseSensitive}
                  onCheckedChange={(caseSensitive) => cambia({ caseSensitive })}
                />
              }
              ultima
            />
          )}
        </Seccion>
      </div>
    </Hoja>
  );
}

/**
 * Las palabras clave. El `TagInput` del escritorio escribe a 14 px, que en el
 * iPhone dispara el zoom de Safari; esto es lo mismo a 17 con las fichas
 * debajo, que es donde caben en una pantalla angosta.
 */
function Palabras({
  valores,
  onChange,
  regex,
}: {
  valores: string[];
  onChange: (v: string[]) => void;
  regex: boolean;
}) {
  const [borrador, setBorrador] = useState('');

  function agrega(crudo: string) {
    const nuevas = crudo
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !valores.includes(p));
    if (nuevas.length) onChange([...valores, ...nuevas]);
    setBorrador('');
  }

  return (
    <>
      <div className="sep-ios relative flex min-h-[44px] items-center gap-3 px-4">
        <span className="w-[104px] shrink-0 text-[17px]">{regex ? 'Expresión' : 'Palabra'}</span>
        <input
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              agrega(borrador);
            } else if (e.key === 'Backspace' && !borrador && valores.length) {
              onChange(valores.slice(0, -1));
            }
          }}
          onBlur={() => borrador && agrega(borrador)}
          placeholder={regex ? 'precio|costo' : 'precio, costo…'}
          autoCapitalize="none"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-[11px] text-[17px] text-txt outline-none placeholder:text-faint"
        />
        <button
          type="button"
          onClick={() => agrega(borrador)}
          disabled={!borrador.trim()}
          className="shrink-0 text-[17px] text-accent active:opacity-50 disabled:opacity-30"
        >
          Añadir
        </button>
      </div>

      <div className="relative px-4 py-2.5">
        {valores.length === 0 ? (
          <p className="text-[13px] text-muted">Todavía ninguna. Sin palabras no se dispara.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {valores.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[15px] font-medium text-accent"
              >
                {v}
                <button
                  type="button"
                  onClick={() => onChange(valores.filter((x) => x !== v))}
                  aria-label={`Quitar ${v}`}
                  className="active:opacity-50"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.6} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

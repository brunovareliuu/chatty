import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { accountRef, listAccounts, runsCol, getAccountToken } from '@/lib/accounts';
import { resumeSleeping, timeoutRun } from '@/lib/engine/runner';
import { getSelfProfile } from '@/lib/instagram';
import { guardarEstado, leerEstado, limpiarHistorial, revisarHito } from '@/lib/push/servidor';
import type { FlowRun } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Latido del sistema. Lo llama Cloud Scheduler cada minuto y hace cuatro cosas:
 *   1. despierta los flujos dormidos en un nodo `wait`
 *   2. saca por la rama 'timeout' a los que llevan demasiado esperando respuesta
 *   3. renueva tokens de Instagram próximos a vencer
 *   4. una vez por hora, refresca seguidores para los checkpoints y poda el historial de avisos
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Falta CRON_SECRET' }, { status: 500 });
  }

  const provided =
    req.headers.get('x-cron-secret') ??
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = Date.now();
  const summary = {
    accounts: 0,
    resumed: 0,
    timedOut: 0,
    tokensChecked: 0,
    seguidoresRevisados: 0,
    errors: [] as string[],
  };

  const cuentas = (await listAccounts()).filter((a) => a.active);

  for (const account of cuentas) {
    summary.accounts++;

    // 1. Flujos dormidos que ya deben continuar.
    const sleeping = await runsCol(account.id)
      .where('status', '==', 'sleeping')
      .where('resumeAt', '<=', now)
      .limit(50)
      .get();

    for (const doc of sleeping.docs) {
      const run = { id: doc.id, ...doc.data() } as FlowRun;
      try {
        await resumeSleeping({ account, run });
        summary.resumed++;
      } catch (err) {
        summary.errors.push(`run ${run.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Esperas de respuesta vencidas.
    const waiting = await runsCol(account.id)
      .where('status', '==', 'waiting_reply')
      .where('waitingUntil', '<=', now)
      .limit(50)
      .get();

    for (const doc of waiting.docs) {
      const run = { id: doc.id, ...doc.data() } as FlowRun;
      try {
        await timeoutRun({ account, run });
        summary.timedOut++;
      } catch (err) {
        summary.errors.push(`timeout ${run.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. getAccountToken renueva solo si quedan menos de 10 días.
    try {
      await getAccountToken(account);
      summary.tokensChecked++;
    } catch (err) {
      summary.errors.push(
        `token ${account.username}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 4. Cada hora: seguidores (checkpoints) y limpieza del historial de avisos.
  try {
    const estado = await leerEstado();
    if (now - (estado.seguidoresRevisadosEn ?? 0) > 60 * 60 * 1000) {
      await guardarEstado({ seguidoresRevisadosEn: now });
      for (const account of cuentas) {
        try {
          const perfil = await getSelfProfile(await getAccountToken(account));
          if (typeof perfil.followers_count === 'number') {
            await accountRef(account.id).update({ followersCount: perfil.followers_count });
            await revisarHito('seguidores', perfil.followers_count);
            summary.seguidoresRevisados++;
          }
        } catch (err) {
          summary.errors.push(
            `seguidores ${account.username}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      await limpiarHistorial();
    }
  } catch (err) {
    summary.errors.push(`hitos: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, ...summary });
}

import 'server-only';

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * En App Hosting / Cloud Run las credenciales vienen del entorno (ADC).
 * En local usamos FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de servicio,
 * en una sola línea) para no depender de gcloud.
 */
function createApp(): App {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (raw) {
    const parsed = JSON.parse(raw);
    return initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
      }),
      projectId: parsed.project_id,
      storageBucket,
    });
  }

  return initializeApp({ projectId, storageBucket });
}

export const adminApp = createApp();
export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

/**
 * Next.js evalúa este módulo en varios workers al construir, y `settings()`
 * solo admite una llamada por instancia. Si ya está configurada, seguimos.
 */
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  /* ya inicializada */
}

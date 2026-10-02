import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// On Firebase App Hosting (and Cloud Run generally), the runtime provides
// Application Default Credentials via the backend's own service account —
// that identity is guaranteed to have proper access to this Firebase
// project, so it's what we want whenever we're actually deployed. K_SERVICE
// is set by Cloud Run (and therefore App Hosting) at runtime, which lets us
// detect "we're deployed" and prefer ADC there unconditionally. Locally, ADC
// usually isn't configured, so fall back to the explicit
// GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY vars — but only locally,
// since that service account's actual Firebase permissions are unverified.
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'hybridx-hub';
  const isDeployed = !!process.env.K_SERVICE;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!isDeployed && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // Deployed on App Hosting: use the backend's own Application Default Credentials.
  return initializeApp({ projectId });
}

export const adminApp = initializeAdminApp();

export const adminFirestore = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

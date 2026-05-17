import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use the specific firestoreDatabaseId from the config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
export const auth = getAuth();
export const storage = getStorage(app);

/**
 * Validates connection to Firestore.
 * This is crucial for early detection of configuration issues.
 */
async function testConnection() {
  try {
    // Attempt to read a non-existent document just to trigger a server request
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log('Firebase: Connection established');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase: Client is offline. Check configuration.");
    } else {
      console.warn('Firebase: Connection test finished with expected response or permission error.');
    }
  }
}

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

/**
 * Standard error handler for Firestore operations to provide rich debugging info.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  
  const errorMessage = JSON.stringify(errInfo);
  console.error('Firestore Error:', errorMessage);
  throw new Error(errorMessage);
}

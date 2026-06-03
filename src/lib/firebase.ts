import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigRaw from '../../firebase-applet-config.json';

// Handle different import styles for JSON
const firebaseConfig = (firebaseConfigRaw as any).default || firebaseConfigRaw;

const config = firebaseConfig;
const databaseId = config.firestoreDatabaseId || config.databaseId;

const app = initializeApp(config);

// Use initializeFirestore to specify connection settings such as experimentalForceLongPolling
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);


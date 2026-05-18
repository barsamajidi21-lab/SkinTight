import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';

// Handle different import styles for JSON
const firebaseConfig = (firebaseConfigRaw as any).default || firebaseConfigRaw;

const config = firebaseConfig;
const databaseId = config.firestoreDatabaseId || config.databaseId;

const app = initializeApp(config);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

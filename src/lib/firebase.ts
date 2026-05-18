import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';

// Handle different import styles for JSON
const firebaseConfig = (firebaseConfigRaw as any).default || firebaseConfigRaw;

console.log("Firebase Config Keys:", Object.keys(firebaseConfig));

const config = firebaseConfig;
const databaseId = config.firestoreDatabaseId || config.databaseId;

console.log("Initializing Firestore with project:", config.projectId, "and database:", databaseId);

const app = initializeApp(config);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_health_check_', 'heartbeat'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.error("Firebase connection error:", error);
    }
  }
}

testConnection();

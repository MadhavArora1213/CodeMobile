import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC7cFwetHGHdgmtPpvN7sQ6iT9NCUSnFzA",
  authDomain: "codemobile-a84ce.firebaseapp.com",
  projectId: "codemobile-a84ce",
  storageBucket: "codemobile-a84ce.firebasestorage.app",
  messagingSenderId: "556364082357",
  appId: "1:556364082357:web:dea4e23b6bfef6aa3422fc",
  measurementId: "G-VY6J6G7WN0"
};

const app = initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;

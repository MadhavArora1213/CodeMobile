import { create } from 'zustand';
import { auth, db } from '../utils/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubToken?: string;
  googleToken?: string;
}

interface AuthStore {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  initialize: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userData: null,
  loading: true,

  initialize: () => {
    if (!auth) return;
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        set({ user, userData: userDoc.data() as UserData || null, loading: false });
      } else {
        set({ user: null, userData: null, loading: false });
      }
    });
  },

  loginWithEmail: async (email, pass) => {
    if (!auth) return;
    set({ loading: true });
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      set({ user, userData: userDoc.data() as UserData || null, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  registerWithEmail: async (email, pass) => {
    if (!auth) return;
    set({ loading: true });
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      const data: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.email?.split('@')[0] || 'User',
        photoURL: `https://ui-avatars.com/api/?name=${user.email}&background=007ACC&color=fff`,
      };
      await setDoc(doc(db, 'users', user.uid), data);
      set({ user, userData: data, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    if (!auth) return;
    await signOut(auth);
    set({ user: null, userData: null });
  },
}));

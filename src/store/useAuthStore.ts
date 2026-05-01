import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { User as AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isEditingProfile: boolean;
  isAdmin: boolean;
  setUser: (user: AppUser | null) => void;
  updateProfile: (data: Partial<AppUser>) => Promise<void>;
  setProfileLoading: (loading: boolean) => void;
  setEditingProfile: (editing: boolean) => void;
  setAdmin: (isAdmin: boolean) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  superLogin: (password: string) => boolean;
}

// Managed listener object to prevent leaks during rapid auth transitions
const listeners = {
  profile: null as (() => void) | null,
  admin: null as (() => void) | null,
  reminders: null as (() => void) | null,
  calendar: null as (() => void) | null,
  cleanup: () => {
    if (listeners.profile) { listeners.profile(); listeners.profile = null; }
    if (listeners.admin) { listeners.admin(); listeners.admin = null; }
    if (listeners.reminders) { listeners.reminders(); listeners.reminders = null; }
    if (listeners.calendar) { listeners.calendar(); listeners.calendar = null; }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isProfileLoading: false,
  isEditingProfile: false,
  isAdmin: false,
  setUser: (user) => set({ user, isLoading: false, isProfileLoading: false }),
  updateProfile: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No user logged in');
    
    const { serverTimestamp, setDoc, doc } = await import('firebase/firestore');
    const { handleFirestoreError, OperationType } = await import('../lib/firebase');
    const userRef = doc(db, 'users', user.id);
    
    try {
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  },
  setProfileLoading: (loading) => set({ isProfileLoading: loading }),
  setEditingProfile: (editing) => set({ isEditingProfile: editing }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  logout: async () => {
    listeners.cleanup();
    await auth.signOut();
    set({ user: null, isAdmin: false });
  },
  deleteAccount: async () => {
    const user = useAuthStore.getState().user;
    const firebaseUser = auth.currentUser;
    if (!user || !firebaseUser) throw new Error('No user logged in');

    const { deleteDoc, doc } = await import('firebase/firestore');
    const { deleteUser } = await import('firebase/auth');

    // 1. Delete Firestore profile
    await deleteDoc(doc(db, 'users', user.id));

    // 2. Delete Auth record
    try {
      await deleteUser(firebaseUser);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('REAUTH_REQUIRED');
      }
      throw error;
    }

    listeners.cleanup();
    set({ user: null, isAdmin: false });
  },
  superLogin: (password) => {
    if (password === 'admin123') { // Secret code for admin mode
      set({ isAdmin: true });
      return true;
    }
    return false;
  }
}));

let currentAuthChangeId = 0;

// Auth listeners
onAuthStateChanged(auth, async (firebaseUser) => {
  const changeId = ++currentAuthChangeId;
  
  // Always clean up existing listeners first
  listeners.cleanup();

  if (firebaseUser) {
    try {
      // Import stores for synchronization
      const { useReminderStore } = await import('./useReminderStore');
      const { useCalendarStore } = await import('./useCalendarStore');
      const { doc: firestoreDoc } = await import('firebase/firestore');
      
      // If another auth change happened while importing, abort this one
      if (changeId !== currentAuthChangeId) return;

      // Initialize sub-stores
      listeners.reminders = useReminderStore.getState().subscribe();
      listeners.calendar = useCalendarStore.getState().subscribe(firebaseUser.uid);

      // Start profile listener
      const profileDocRef = firestoreDoc(db, 'users', firebaseUser.uid);
      
      listeners.profile = onSnapshot(profileDocRef, (doc) => {
        if (changeId !== currentAuthChangeId) return;
        
        if (doc.exists()) {
          const userData = { id: doc.id, ...doc.data() } as AppUser;
          useAuthStore.getState().setUser(userData);
          
          const isHardcodedAdmin = ['ishan10gautam@gmail.com', 'shreal.suraj@gmail.com', 'user.suniltim@gmail.com'].includes(firebaseUser.email || '');
          if (isHardcodedAdmin) {
            useAuthStore.getState().setAdmin(true);
          }
        } else {
          useAuthStore.getState().setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || '',
            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            onboardingComplete: false
          } as AppUser);
          
          const isHardcodedAdmin = ['ishan10gautam@gmail.com', 'shreal.suraj@gmail.com', 'user.suniltim@gmail.com'].includes(firebaseUser.email || '');
          if (isHardcodedAdmin) {
            useAuthStore.getState().setAdmin(true);
          }
        }
      }, (error) => {
        if ((error as any).code !== 'permission-denied') {
          console.error('Profile sync error:', error);
        }
      });

      // Start admin listener
      const adminDocRef = firestoreDoc(db, 'admins', firebaseUser.uid);
      listeners.admin = onSnapshot(adminDocRef, (doc) => {
        if (changeId !== currentAuthChangeId) return;
        if (doc.exists()) {
          useAuthStore.getState().setAdmin(true);
        }
      }, (error) => {
        if ((error as any).code !== 'permission-denied') {
          console.warn('Admin status check error:', error);
        }
      });

    } catch (err) {
      console.error('Auth handler error:', err);
    }
  } else {
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setAdmin(false);
  }
});

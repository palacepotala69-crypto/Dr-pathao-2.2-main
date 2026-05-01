import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import dayjs from '../utils/date';
import { CalendarEvent } from '../types';

interface CalendarState {
  events: CalendarEvent[];
  globalEvents: CalendarEvent[];
  dismissedEventIds: string[];
  isLoading: boolean;
  error: string | null;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEventStatus: (id: string) => Promise<void>;
  subscribe: (uid?: string) => (() => void);
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  globalEvents: [],
  dismissedEventIds: [],
  isLoading: true,
  error: null,

  subscribe: (uid?: string) => {
    const user = uid ? { uid } : auth.currentUser;
    if (!user) {
      set({ events: [], globalEvents: [], dismissedEventIds: [], isLoading: false });
      return () => {};
    }

    const userPath = `users/${user.uid}/events`;
    const globalPath = `master_calendar`;
    const dismissedPath = `users/${user.uid}/dismissed_events`;

    const userQuery = query(collection(db, userPath), orderBy('date', 'asc'));
    const globalQuery = query(
      collection(db, globalPath), 
      where('type', '==', 'public'),
      orderBy('date', 'asc')
    );
    const dismissedQuery = query(collection(db, dismissedPath));

    const unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return { 
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });
      set({ events, error: null });
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, userPath);
      }
      set({ error: error.message });
    });

    const unsubscribeGlobal = onSnapshot(globalQuery, (snapshot) => {
      const globalEvents = snapshot.docs.map(doc => ({ 
        ...(doc.data() as CalendarEvent),
        id: doc.id 
      }));
      set({ globalEvents });
      if (get().isLoading) set({ isLoading: false });
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, globalPath);
      }
      set({ globalEvents: [] });
    });

    const unsubscribeDismissed = onSnapshot(dismissedQuery, (snapshot) => {
      const dismissedEventIds = snapshot.docs.map(doc => doc.id);
      set({ dismissedEventIds });
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, dismissedPath);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeGlobal();
      unsubscribeDismissed();
    };
  },

  addEvent: async (event) => {
    const user = auth.currentUser;
    if (!user) return;

    const id = Math.random().toString(36).substring(2, 9);
    const path = `users/${user.uid}/events/${id}`;

    try {
      await setDoc(doc(db, path), {
        ...event,
        id,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateEvent: async (id, updatedEvent) => {
    const user = auth.currentUser;
    if (!user) return;

    const path = `users/${user.uid}/events/${id}`;
    try {
      await updateDoc(doc(db, path), {
        ...updatedEvent,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteEvent: async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    // Check if it's a personal event
    const isPersonal = get().events.some(e => e.id === id);
    
    if (isPersonal) {
      const path = `users/${user.uid}/events/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      // It's a global event, mark as dismissed for this user
      const path = `users/${user.uid}/dismissed_events/${id}`;
      try {
        await setDoc(doc(db, path), { dismissedAt: serverTimestamp() });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  },

  toggleEventStatus: async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const event = get().events.find(e => e.id === id);
    if (!event) return;

    const path = `users/${user.uid}/events/${id}`;
    try {
      await updateDoc(doc(db, path), {
        status: event.status === 'completed' ? 'pending' : 'completed',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}));

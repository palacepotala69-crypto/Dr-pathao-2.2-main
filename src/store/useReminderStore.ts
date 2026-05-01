import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

interface Medication {
  id: string;
  userId: string;
  title: string;
  dosage: string;
  time: string;
  time2?: string;
  frequency: 'daily' | 'twice_daily' | 'custom' | 'once';
  type: 'medication' | 'vaccination' | 'cycle' | 'appointment' | 'followup';
  daysOfWeek?: number[];
  customDates?: string[];
  taken: boolean;
  takenLogs?: Record<string, boolean>;
  slot?: number;
  dosesPerDay?: number;
  displayTime?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface ReminderState {
  medicines: Medication[];
  isLoading: boolean;
  error: string | null;
  toggleMedicine: (id: string, date: string, doseIndex?: number) => Promise<void>;
  addMedicine: (med: Omit<Medication, 'id' | 'userId' | 'taken' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  updateMedicine: (id: string, med: Partial<Medication>) => Promise<void>;
  subscribe: (uid?: string) => (() => void);
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  medicines: [],
  isLoading: true,
  error: null,

  subscribe: (uid?: string) => {
    const user = uid ? { uid } : auth.currentUser;
    if (!user) {
      set({ medicines: [], isLoading: false });
      return () => {};
    }

    const path = `users/${user.uid}/reminders`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medicines = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return { 
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });
      set({ medicines, isLoading: false, error: null });
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      set({ error: error.message, isLoading: false });
    });

    return unsubscribe;
  },

  updateMedicine: async (id, updatedMed) => {
    const user = auth.currentUser;
    if (!user) return;

    const path = `users/${user.uid}/reminders/${id}`;
    try {
      await updateDoc(doc(db, path), {
        ...updatedMed,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  toggleMedicine: async (id, date, doseIndex) => {
    const user = auth.currentUser;
    if (!user) return;

    const med = get().medicines.find(m => m.id === id);
    if (!med) return;

    const logKey = doseIndex !== undefined ? `${date}_${doseIndex}` : date;
    const currentLogs = med.takenLogs || {};
    const newTaken = !currentLogs[logKey];

    const path = `users/${user.uid}/reminders/${id}`;
    try {
      await updateDoc(doc(db, path), {
        [`takenLogs.${logKey}`]: newTaken,
        // Update main taken for backward compat/simple view if needed, 
        // but preferably rely on logs for history
        taken: newTaken, 
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  addMedicine: async (med) => {
    const user = auth.currentUser;
    if (!user) return;

    const id = Math.random().toString(36).substring(2, 9);
    const path = `users/${user.uid}/reminders/${id}`;
    
    try {
      await setDoc(doc(db, path), {
        ...med,
        id,
        userId: user.uid,
        taken: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  deleteMedicine: async (id) => {
    const user = auth.currentUser;
    if (!user || !id) return;

    // Sanitize ID: remove suffixes like -1, -2 used for twice-daily display
    const baseId = id.replace(/-[12]$/, '');
    const path = `users/${user.uid}/reminders/${baseId}`;
    
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      console.error('Firestore delete failed:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}));

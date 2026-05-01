import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDoc, serverTimestamp, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Disable offline persistence to avoid internal assertion errors in sandboxed iframes
// if (typeof window !== 'undefined') {
//   enableIndexedDbPersistence(db).catch((err) => {
//     if (err.code === 'failed-precondition') {
//       console.warn('Firestore persistence failed: Multiple tabs open');
//     } else if (err.code === 'unimplemented') {
//       console.warn('Firestore persistence failed: Browser not supported');
//     }
//   });
// }

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const createUserProfile = async (user: User, role: 'patient' | 'provider' | 'lab' = 'patient', providerType?: string) => {
  const userDocRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        name: user.displayName || 'No Name',
        email: user.email || 'No Email',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        role: role || 'patient',
        ...(providerType ? { providerType } : {}),
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const data = userDoc.data();
      // If user exists but role is missing OR we are explicitly trying to set a professional role
      // This helps if a user previously signed in as a patient but now wants to be a professional
      if ((!data?.role || data?.role === 'patient') && role && role !== 'patient') {
        console.log(`Updating existing user ${user.uid} to role: ${role}`);
        await setDoc(userDocRef, {
          role: role,
          ...(providerType ? { providerType } : {}),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (error) {
    // Only throw if NOT a permission error (which could happen during sign-out transitions)
    if ((error as any)?.code !== 'permission-denied') {
      console.error('Error in createUserProfile:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  }
};

export const signInWithGoogle = async (intendedRole?: 'patient' | 'provider' | 'lab', providerType?: string) => {
  const isPlaceholder = firebaseConfig.projectId.includes('remixed-') || firebaseConfig.apiKey.includes('remixed-');
  
  if (isPlaceholder) {
    const error = new Error("DR.Pathao is in Demo Mode. Please use the 'Set up Firebase' tool in the sidebar to connect your real Firebase project and fix the API key error.");
    console.error(error.message);
    throw error;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserProfile(result.user, intendedRole, providerType);
    return result.user;
  } catch (error: any) {
    console.error('Auth Error (Google):', error.code, error.message);
    if (error.code === 'auth/invalid-api-key' || error.code === 'auth/network-request-failed') {
      console.warn("Auth failed: Please check if your Firebase config is correct and you have an active internet connection.");
    }
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, name: string, intendedRole: 'patient' | 'provider' | 'lab' = 'patient', providerType?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    try {
      await sendEmailVerification(result.user);
    } catch (ve) {
      console.warn('Could not send verification email:', ve);
    }
    await createUserProfile({ ...result.user, displayName: name } as User, intendedRole, providerType);
    return result.user;
  } catch (error) {
    console.error('Sign Up Error:', error);
    throw error;
  }
};

export const resendVerificationEmail = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const signInWithEmail = async (email: string, password: string, intendedRole?: 'patient' | 'provider' | 'lab', providerType?: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Ensure profile exists (might be missing if manual auth change happened)
    await createUserProfile(result.user, intendedRole, providerType);
    return result.user;
  } catch (error: any) {
    console.error('Sign In Error (Email):', error.code, error.message);
    if (error.code === 'auth/operation-not-allowed') {
      console.warn("SIGN-IN FAILED: Email/Password login is not enabled in your Firebase Console. Go to Auth > Sign-in method to enable it.");
    }
    throw error;
  }
};

export const sendPasswordReset = async (email: string) => {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, email);
};

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Avoid noisy permission errors during logout transitions
  if ((error as any)?.code === 'permission-denied' && !auth.currentUser) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  // Check if we are using placeholder values from a remix
  const isPlaceholder = firebaseConfig.projectId.includes('remixed-') || firebaseConfig.apiKey.includes('remixed-');
  
  if (isPlaceholder) {
    console.info("Firebase is in 'Demo Mode' with placeholder configuration. Please use the 'Set up Firebase' tool to connect a real database.");
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('permission-denied'))) {
      console.warn("Firebase connection failed: The project may not have a Firestore database provisioned yet.");
    }
  }
}
testConnection();

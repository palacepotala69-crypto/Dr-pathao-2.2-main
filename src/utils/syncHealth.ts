import { getDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Diagnostic utility to verify why a provider might not be appearing in the User Portal.
 * @param providerId The UID of the provider to check.
 */
export async function checkProviderSyncStatus(providerId: string) {
  console.log(`--- Starting Sync Health Check for: ${providerId} ---`);
  
  try {
    // 1. Check User Account
    const userDoc = await getDoc(doc(db, 'users', providerId));
    if (!userDoc.exists()) {
      return { 
        status: 'error', 
        message: 'UID not found in "users" collection. The provider has not created an account yet.' 
      };
    }
    
    const data = userDoc.data();
    const isVerified = data.providerInfo?.isVerified === true;
    const role = data.role;
    const type = data.providerType;

    // 2. Check Security Role Requirements
    const isValidRole = ['provider', 'lab'].includes(role);
    
    // 3. Check for Stale Duplicates in manual collections
    const doctorSearch = await getDocs(query(collection(db, 'doctors'), where('__name__', '==', providerId)));
    const nurseSearch = await getDocs(query(collection(db, 'nurses'), where('__name__', '==', providerId)));
    
    const status = {
      isVerified,
      role,
      providerType: type,
      linkedDoctorDoc: !doctorSearch.empty,
      linkedNurseDoc: !nurseSearch.empty,
      onboardingComplete: data.onboardingComplete
    };

    if (!isVerified) {
      return { 
        status: 'pending', 
        message: 'Provider is not verified. Admin must approve this profile in the Admin Console.',
        details: status
      };
    }

    if (!isValidRole) {
       return { 
         status: 'error', 
         message: `Provider has incorrect role: "${role}". Must be "provider" or "lab".`,
         details: status
       };
    }

    return { 
      status: 'healthy', 
      message: 'Provider is correctly configured and should be visible in the User Portal.',
      details: status
    };

  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown Firestore error' 
    };
  }
}

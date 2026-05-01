import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Stethoscope, 
  HeartPulse, 
  Pill, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Save,
  Edit2, 
  ChevronRight,
  TrendingUp,
  Users,
  BriefcaseMedical,
  Loader2,
  FlaskConical,
  Bell,
  Megaphone,
  ShieldCheck,
  User as UserIcon,
  Activity,
  Brain
} from 'lucide-react';
import { 
  DOCTOR_SPECIALTIES, 
  NURSE_SPECIALTIES, 
  MEDICINE_CATEGORIES 
} from '../../constants';
import { 
  onSnapshot,
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { clsx } from 'clsx';
import dayjs from '../../utils/date';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'doctors' | 'nurses' | 'pharmacy' | 'labs' | 'notifications' | 'professionals' | 'bookings';

export default function AdminScreen() {
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const firebaseUser = auth.currentUser;
  const [activeTab, setActiveTab] = useState<AdminTab>('professionals');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [doctors, setDoctors] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profCategory, setProfCategory] = useState<'all' | 'doctor' | 'nurse' | 'pharmacist' | 'lab' | 'physiotherapist' | 'psychologist'>('all');
  
  const [users, setUsers] = useState<any[]>([]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Diagnostic states
  const [diagnosticId, setDiagnosticId] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const runDiagnostic = async () => {
    if (!diagnosticId) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', diagnosticId);
      const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', diagnosticId)));
      
      const userData = userSnap.docs.length > 0 ? userSnap.docs[0].data() : null;
      
      // Check other collections
      const docSnap = await getDocs(query(collection(db, 'doctors'), where('__name__', '==', diagnosticId)));
      const nurseSnap = await getDocs(query(collection(db, 'nurses'), where('__name__', '==', diagnosticId)));
      
      setDiagnosticResult({
        id: diagnosticId,
        inUsers: !!userData,
        isVerified: userData?.providerInfo?.isVerified,
        role: userData?.role,
        inDoctors: docSnap.docs.length > 0,
        inNurses: nurseSnap.docs.length > 0,
        data: userData
      });
    } catch (error) {
      console.error("Diagnostic failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const healProvider = async (id: string) => {
    setIsProcessing(true);
    try {
      // If document exists in doctors/nurses with a UID but is actually a User account, 
      // we might want to delete the stale mirror record or merge them.
      // For now, let's just make sure the User account is verified.
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        "providerInfo.isVerified": true,
        "isVerified": true,
        "is_approved": true,
        updatedAt: serverTimestamp()
      });
      alert("Provider verification synchronized across all protocols.");
      runDiagnostic();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateVerified = async (uid: string, status: boolean) => {
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        "providerInfo.isVerified": status,
        "isVerified": status,
        "is_approved": status,
        updatedAt: serverTimestamp()
      });
      
      // Sync manual mirror collections
      const doctorsQuery = query(collection(db, 'doctors'), where('__name__', '==', uid));
      const nursesQuery = query(collection(db, 'nurses'), where('__name__', '==', uid));
      const [dSnap, nSnap] = await Promise.all([getDocs(doctorsQuery), getDocs(nursesQuery)]);
      
      const syncTasks: Promise<void>[] = [];
      dSnap.forEach(d => syncTasks.push(updateDoc(doc(db, 'doctors', d.id), { isVerified: status, is_approved: status })));
      nSnap.forEach(n => syncTasks.push(updateDoc(doc(db, 'nurses', n.id), { isVerified: status, is_approved: status })));
      await Promise.all(syncTasks);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditProfessional = (client: any) => {
    setEditingUser(client);
    setFormData({
      ...client.providerInfo,
      id: client.id,
      name: client.name,
      email: client.email, // Ensure email is preserved
      isUserAccount: true
    });
    setEditingId(client.id);
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    let colName = activeTab === 'pharmacy' ? 'medicines' : activeTab;
    if (activeTab === 'labs') colName = 'lab_tests';
    if (activeTab === 'notifications') colName = 'announcements';
    if (activeTab === 'bookings') colName = 'appointments';

    if (activeTab === 'bookings') {
      const q1 = collection(db, 'appointments');
      const q2 = collection(db, 'nursing_bookings');
      const q3 = collection(db, 'lab_bookings');

      const unsub1 = onSnapshot(q1, (s) => {
        const d1 = s.docs.map(d => ({ id: d.id, ...d.data(), source: 'appointment' }));
        const unsub2 = onSnapshot(q2, (s2) => {
          const d2 = s2.docs.map(d => ({ id: d.id, ...d.data(), source: 'nursing' }));
          const unsub3 = onSnapshot(q3, (s3) => {
            const d3 = s3.docs.map(d => ({ id: d.id, ...d.data(), source: 'lab' }));
            setAppointments([...d1, ...d2, ...d3]);
            setIsLoading(false);
          });
        });
      });

      return () => {
        // This is a bit messy for unsubs but works for simple case
      };
    }

    const unsubscribe = onSnapshot(collection(db, colName), 
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (activeTab === 'doctors') setDoctors(data);
        else if (activeTab === 'nurses') setNurses(data);
        else if (activeTab === 'labs') setLabTests(data);
        else if (activeTab === 'notifications') setNotifications(data);
        else if (activeTab === 'bookings') setAppointments(data);
        else setMedicines(data);
        setIsLoading(false);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.error(`Error fetching ${activeTab}:`, error);
          handleFirestoreError(error, OperationType.GET, activeTab);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, activeTab, navigate]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      alert("Authentication Required: You must be signed in with Google to modify records. Go to Profile to sign in.");
      return;
    }
    setIsProcessing(true);
    try {
      if (activeTab === 'professionals' || formData.isUserAccount) {
        const userRef = doc(db, 'users', editingId!);
        const { id, name, isUserAccount, ...providerInfo } = formData;
        
        const updateData: any = {
          name,
          updatedAt: serverTimestamp()
        };
        
        Object.keys(providerInfo).forEach(key => {
          if (key === 'email' || key === 'role') return;
          // Sync isVerified to multiple possible flags
          if (key === 'isVerified') {
             updateData['is_approved'] = providerInfo[key];
             updateData['isVerified'] = providerInfo[key];
             updateData[`providerInfo.isVerified`] = providerInfo[key];
          } else {
             updateData[`providerInfo.${key}`] = providerInfo[key];
          }
        });

        await updateDoc(userRef, updateData);
        alert("Record persisted successfully.");
        setIsAddModalOpen(false);
        setEditingId(null);
        setEditingUser(null);
        setFormData({});
        return;
      }

      let colName = activeTab === 'pharmacy' ? 'medicines' : activeTab;
      if (activeTab === 'labs') colName = 'lab_tests';
      if (activeTab === 'notifications') colName = 'announcements';
      if (activeTab === 'bookings') colName = 'appointments';

      // Clean up formData to remove id and other non-data fields
      const { id, ...cleanData } = formData;
      const docData = {
        ...cleanData,
        updatedAt: serverTimestamp(),
      };
      
      if (editingId) {
        await updateDoc(doc(db, colName, editingId), docData);
      } else {
        docData.createdAt = serverTimestamp();
        
        // Manual entries created by Admin MUST be visible by default
        if (activeTab === 'doctors' || activeTab === 'nurses' || activeTab === 'labs') {
          docData.isVerified = true;
          docData.is_approved = true;
          // IMPORTANT: Default types to ensure visibility in 'Consult Doctor' filters
          docData.types = docData.types || ['tele', 'home'];
          
          if (activeTab === 'doctors' || activeTab === 'nurses') {
             docData.rating = docData.rating || 4.8;
             docData.available = docData.available ?? true;
          }
        }
        
        if (activeTab === 'notifications') {
          docData.author = firebaseUser.displayName || 'Admin';
          // Also sync to master calendar events
          await addDoc(collection(db, 'master_calendar'), {
            title: docData.title,
            description: docData.message,
            date: dayjs().format('YYYY-MM-DD'),
            time: dayjs().format('HH:mm'),
            category: 'alert',
            type: 'public',
            author: docData.author,
            createdAt: serverTimestamp()
          });
        }
        await addDoc(collection(db, colName), docData);
      }
      
      setIsAddModalOpen(false);
      setEditingId(null);
      setFormData({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, activeTab);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditItem = (item: any) => {
    if (item.isUserAccount) {
      handleEditProfessional(item);
      return;
    }
    setFormData(item);
    setEditingId(item.id);
    setIsAddModalOpen(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const handleDeleteItem = async (id: string | null) => {
    if (!id || !firebaseUser) {
      alert("Authentication Required: You must be signed in with Google to delete records.");
      setDeleteConfirmId(null);
      return;
    }
    setIsProcessing(true);
    try {
      const itemToDelete = filteredItems.find(i => i.id === id);
      
      let colName = activeTab === 'pharmacy' ? 'medicines' : activeTab;
      if (activeTab === 'labs') colName = 'lab_tests';
      if (activeTab === 'notifications') colName = 'announcements';
      if (activeTab === 'bookings') colName = 'appointments';
      
      if (itemToDelete?.isUserAccount) {
        // We don't delete the user account authentication, but we can wipe their provider status
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, {
           role: 'user', // Downgrade to standard user
           providerType: null,
           providerInfo: null,
           isVerified: false,
           is_approved: false
        });
        alert("Professional access revoked and converted to standard user.");
      } else {
        await deleteDoc(doc(db, colName, id));
        alert("Entry permanently removed.");
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error(`Error deleting from ${activeTab}:`, error);
      handleFirestoreError(error, OperationType.DELETE, activeTab);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = (() => {
    if (activeTab === 'professionals') {
      return (users || []).filter(u => {
        if (u.role !== 'provider' && u.role !== 'lab') return false;
        if (profCategory === 'all') return true;
        if (u.role === 'lab' && profCategory === 'lab') return true;
        return u.providerType === profCategory;
      }).filter(u => 
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.providerType || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    let items = (
      activeTab === 'doctors' ? doctors : 
      activeTab === 'nurses' ? nurses : 
      activeTab === 'labs' ? labTests :
      activeTab === 'notifications' ? notifications :
      activeTab === 'bookings' ? appointments :
      medicines
    ) || [];

    // Merge verified professionals from users collection into domain tabs
    if (activeTab === 'doctors') {
      const userDoctors = users.filter(u => u.role === 'provider' && ['doctor', 'physician', 'physiotherapist', 'psychologist'].includes(u.providerType) && u.providerInfo?.isVerified)
        .map(u => ({ 
          ...u, 
          ...u.providerInfo, 
          isUserAccount: true,
          name: u.name,
          specialty: u.providerInfo?.specialty || u.providerType
        }));
      items = [...items, ...userDoctors];
    } else if (activeTab === 'nurses') {
      const userNurses = users.filter(u => u.role === 'provider' && u.providerType === 'nurse' && u.providerInfo?.isVerified)
        .map(u => ({ 
          ...u, 
          ...u.providerInfo, 
          isUserAccount: true,
          name: u.name,
          specialty: u.providerInfo?.specialty || 'General Nursing'
        }));
      items = [...items, ...userNurses];
    } else if (activeTab === 'labs') {
      const userLabs = users.filter(u => u.role === 'lab' && u.providerInfo?.isVerified)
        .map(u => ({ 
          ...u, 
          ...u.providerInfo, 
          isUserAccount: true,
          title: u.name || u.providerInfo?.labName || 'Private Laboratory',
          category: 'Diagnostic'
        }));
      items = [...items, ...userLabs];
    } else if (activeTab === 'pharmacy') {
      const userPharmacists = users.filter(u => u.role === 'provider' && u.providerType === 'pharmacist' && u.providerInfo?.isVerified)
        .map(u => ({ 
          ...u, 
          ...u.providerInfo, 
          isUserAccount: true,
          name: u.name,
          category: 'Clinical / Retail'
        }));
      items = [...items, ...userPharmacists];
    }

    return items.filter(item => 
      (item.name || item.title || item.userName || item.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.specialty || item.category || item.status || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  })();

  const handleUpdateBookingStatus = async (id: string, newStatus: string, docSource?: string) => {
    setIsProcessing(true);
    try {
      const col = docSource === 'nursing' ? 'nursing_bookings' : 
                  docSource === 'lab' ? 'lab_bookings' : 
                  'appointments';
      
      await updateDoc(doc(db, col, id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bookings/${id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 pt-8 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full -mr-32 -mt-32 opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] bg-amber-500/20 text-amber-400 font-black px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/30">
              Admin Portal
            </span>
            <button 
              onClick={() => navigate('/')}
              className="text-white/60 hover:text-white text-xs font-bold transition-colors"
            >
              Exit Admin
            </button>
          </div>
          <h1 className="text-3xl font-black text-white">Console</h1>
          <p className="text-slate-400 text-sm mt-1">Manage app resources and database</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 -mt-8 relative z-20">
        <div className="bg-white p-2 rounded-3xl shadow-xl flex gap-1 border border-slate-100">
          {[
            { id: 'professionals', label: 'Verify', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { id: 'doctors', label: 'Doctors', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'nurses', label: 'Nurses', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
            { id: 'pharmacy', label: 'Pharmacy', icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { id: 'bookings', label: 'Bookings', icon: BriefcaseMedical, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'labs', label: 'Labs', icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50' },
            { id: 'notifications', label: 'Push', icon: Bell, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={clsx(
                "flex-1 flex flex-col items-center py-3 rounded-2xl transition-all",
                activeTab === tab.id ? `${tab.bg} ${tab.color} scale-100 shadow-sm border border-slate-100` : "text-slate-400 grayscale opacity-40 hover:opacity-70 scale-95"
              )}
            >
              <tab.icon size={20} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="p-6">
        {/* Search and Stats */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          {activeTab !== 'professionals' && (
            <button 
              onClick={() => {
                setFormData({});
                setIsAddModalOpen(true);
              }}
              className="aspect-square bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 active:scale-95 transition-transform"
            >
              <Plus size={24} />
            </button>
          )}
        </div>

        {activeTab === 'professionals' && (
          <div className="bg-amber-50 rounded-[32px] p-6 mb-8 border border-amber-200 shadow-sm shadow-amber-100/50">
            <div className="flex items-center gap-3 mb-4">
               <ShieldCheck className="text-amber-600" size={24} />
               <h3 className="font-black text-slate-800 uppercase tracking-tight">Sync Health Diagnostics</h3>
            </div>
            <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Paste Provider ID (UID) here..."
                 value={diagnosticId}
                 onChange={(e) => setDiagnosticId(e.target.value)}
                 className="flex-1 bg-white border border-amber-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
               />
               <button 
                 onClick={runDiagnostic}
                 className="bg-amber-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
               >
                 Verify Source
               </button>
            </div>
            {diagnosticResult && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-6 pt-6 border-t border-amber-200/50 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-4 rounded-2xl border border-amber-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Users Collection</p>
                      <p className={clsx("text-xs font-black", diagnosticResult.inUsers ? "text-emerald-500" : "text-rose-500")}>
                        {diagnosticResult.inUsers ? 'Linked' : 'Missing'}
                      </p>
                      {diagnosticResult.inUsers && (
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Role: {diagnosticResult.role}</p>
                      )}
                   </div>
                   <div className="bg-white p-4 rounded-2xl border border-amber-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mirror Status</p>
                      <p className="text-xs font-black text-slate-900">
                        {diagnosticResult.inDoctors ? 'Found in Doctors' : diagnosticResult.inNurses ? 'Found in Nurses' : 'Standalone'}
                      </p>
                   </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-amber-100">
                   <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Verification Flag</p>
                     <p className={clsx("text-sm font-black", diagnosticResult.isVerified ? "text-emerald-500" : "text-amber-500")}>
                       {diagnosticResult.isVerified ? 'VERIFIED (VISIBLE)' : 'UNVERIFIED (HIDDEN)'}
                     </p>
                   </div>
                   {!diagnosticResult.isVerified && diagnosticResult.inUsers && (
                     <button 
                       onClick={() => healProvider(diagnosticResult.id)}
                       className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                     >
                       Force Sync
                     </button>
                   )}
                </div>
                <button 
                  onClick={() => setDiagnosticResult(null)}
                  className="w-full py-2 text-[8px] font-black text-amber-600 uppercase tracking-[0.2em]"
                >
                  Clear Diagnostic
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Professional Categories */}
        {activeTab === 'professionals' && (
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
            {[
              { id: 'all', label: 'All', icon: ShieldCheck },
              { id: 'doctor', label: 'Doctors', icon: Stethoscope },
              { id: 'nurse', label: 'Nurses', icon: HeartPulse },
              { id: 'lab', label: 'Labs', icon: FlaskConical },
              { id: 'pharmacist', label: 'Pharmacy', icon: Pill },
              { id: 'physiotherapist', label: 'Physio', icon: Activity },
              { id: 'psychologist', label: 'Psych', icon: Brain },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setProfCategory(cat.id as any)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                  profCategory === cat.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"
                )}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content List */}
        <div className="flex flex-col gap-4 pb-20">
          {isLoading && !['professionals', 'bookings'].includes(activeTab) ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="animate-spin text-slate-900" size={40} />
              <p className="text-sm font-bold uppercase tracking-widest">Loading Records...</p>
            </div>
          ) : activeTab === 'bookings' ? (
            <div className="grid grid-cols-1 gap-4">
               {appointments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(appt => (
                 <div key={appt.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner",
                            appt.type === 'home' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                             {appt.type === 'home' ? <UserIcon size={20} /> : <Stethoscope size={20} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">
                              {appt.type === 'home' ? 'Home Visit' : 'Tele-Consult'} • {appt.bookingOption || 'Standard'}
                            </p>
                            <h4 className="font-black text-slate-900 uppercase tracking-tight">{appt.userName}</h4>
                          </div>
                       </div>
                       <div className={clsx(
                         "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                         appt.status === 'pending' ? "bg-amber-50 text-amber-600" :
                         appt.status === 'confirmed' ? "bg-blue-50 text-blue-600" :
                         appt.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                         "bg-rose-50 text-rose-600"
                       )}>
                         {appt.status}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Provider</p>
                          <p className="text-xs font-black text-slate-900 truncate tracking-tight">{appt.doctorName}</p>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Schedule</p>
                          <p className="text-xs font-black text-slate-900 truncate tracking-tight">{appt.preferredDate} • {appt.preferredTime}</p>
                       </div>
                    </div>

                    {((appt.location?.address) || (typeof appt.location === 'string' && appt.location)) && (
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                           <ShieldAlert size={12} className="text-blue-600" />
                           <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Site Address</p>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{appt.location?.address || appt.location}"</p>
                        {appt.userPhone && (
                           <p className="text-[10px] font-black text-slate-900 mt-2 uppercase tracking-tight">Contact: {appt.userPhone}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                       {appt.status === 'pending' && (
                         <button 
                           onClick={() => handleUpdateBookingStatus(appt.id, 'confirmed', appt.source)}
                           className="flex-1 bg-blue-600 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                         >
                           Confirm
                         </button>
                       )}
                       {appt.status === 'confirmed' && (
                         <button 
                           onClick={() => handleUpdateBookingStatus(appt.id, 'completed', appt.source)}
                           className="flex-1 bg-emerald-600 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                         >
                           Mark Done
                         </button>
                       )}
                       {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                         <button 
                           onClick={() => handleUpdateBookingStatus(appt.id, 'cancelled', appt.source)}
                           className="p-3 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all"
                         >
                           Cancel
                         </button>
                       )}
                    </div>
                 </div>
               ))}
               {appointments.length === 0 && (
                 <div className="py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center px-12">
                   <BriefcaseMedical size={48} className="text-slate-200 mb-4" />
                   <h4 className="text-xl font-black text-slate-900 uppercase">Archive Empty</h4>
                   <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">No appointments logged in the system yet.</p>
                 </div>
               )}
            </div>
          ) : activeTab === 'professionals' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(client => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={client.id} 
                    className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500"
                  >
                     <div className="flex items-start justify-between mb-6">
                       <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 ring-4 ring-slate-50/50">
                           {client.avatar ? (
                             <img src={client.avatar} className="w-full h-full object-cover" />
                           ) : (
                             <UserIcon className="text-slate-300" size={24} />
                           )}
                         </div>
                         <div>
                           <h4 className="font-black text-slate-900 uppercase tracking-tight leading-none text-lg">{client.name}</h4>
                           <div className="flex items-center gap-1.5 mt-2">
                             <div className={clsx(
                               "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                               client.role === 'lab' ? "bg-amber-50 border-amber-100 text-amber-600" :
                               client.providerType === 'nurse' ? "bg-rose-50 border-rose-100 text-rose-600" :
                               "bg-blue-50 border-blue-100 text-blue-600"
                             )}>
                               {client.role === 'lab' ? 'Lab Owner' : client.providerType}
                             </div>
                             <span className="text-slate-200 text-[10px]">•</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{client.providerInfo?.specialty}</span>
                           </div>
                         </div>
                       </div>
                       
                       <div className={clsx(
                         "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                         client.providerInfo?.isVerified 
                           ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                           : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                       )}>
                         {client.providerInfo?.isVerified ? (
                           <>
                             <ShieldCheck size={10} />
                             <span>Active</span>
                           </>
                         ) : (
                           <>
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                             <span>Appraisal</span>
                           </>
                         )}
                       </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3 mb-6">
                       <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee</p>
                         <p className="text-xs font-black text-slate-900 leading-none">Rs.{client.providerInfo?.consultationFee || 0}</p>
                       </div>
                       <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50 text-center">
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">EXP</p>
                         <p className="text-xs font-black text-slate-900 leading-none">{client.providerInfo?.experience || 0}y</p>
                       </div>
                       <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50 text-right">
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Ops</p>
                         <p className={clsx(
                           "text-[9px] font-black leading-none",
                           client.providerInfo?.available ? "text-emerald-500" : "text-slate-400"
                         )}>
                           {client.providerInfo?.available ? 'ON' : 'OFF'}
                         </p>
                       </div>
                     </div>

                     <div className="flex-1 space-y-4 mb-6">
                        <div className={clsx(
                          "p-4 rounded-3xl border",
                          client.role === 'lab' ? "bg-amber-50/30 border-amber-100/50" :
                          client.providerType === 'nurse' ? "bg-rose-50/30 border-rose-100/50" :
                          "bg-blue-50/30 border-blue-100/50"
                        )}>
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/30 pb-2">
                             <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical ID</h6>
                             <p className="text-[9px] font-bold text-slate-900 truncate ml-2 text-right">{client.providerInfo?.licenseNumber || client.providerInfo?.companyRegNumber || 'No ID'}</p>
                          </div>
                          
                          {client.role === 'lab' ? (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight flex justify-between">
                                <span className="text-slate-400 font-bold">Lab:</span> <span className="truncate ml-4 max-w-[120px]">{client.providerInfo?.labName || 'Diagnostic'}</span>
                              </p>
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight flex justify-between">
                                <span className="text-slate-400 font-bold">Tech:</span> <span className="truncate ml-4 max-w-[120px]">{client.providerInfo?.technicianDetails?.name || 'N/A'}</span>
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight flex justify-between">
                                <span className="text-slate-400 font-bold text-[9px]">Inst:</span> 
                                <span className="truncate ml-4 max-w-[120px]">{client.providerInfo?.currentHospital || 'Self'}</span>
                              </p>
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight flex justify-between">
                                <span className="text-slate-400 font-bold text-[9px]">Afil:</span>
                                <span className="truncate ml-4 max-w-[120px]">{client.providerInfo?.affiliatedHospitals?.join(', ') || 'N/A'}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {client.providerInfo?.bio && (
                          <div className="px-1 text-[11px] text-slate-500 font-medium italic leading-relaxed line-clamp-2 text-center">
                            "{client.providerInfo.bio}"
                          </div>
                        )}
                     </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-50">
                       <button 
                         onClick={() => handleUpdateVerified(client.id, !client.providerInfo?.isVerified)}
                         className={clsx(
                           "flex-1 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                           client.providerInfo?.isVerified 
                             ? "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600" 
                             : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95"
                         )}
                       >
                         {client.providerInfo?.isVerified ? (
                           <>
                             <X size={14} />
                             <span>Revoke</span>
                           </>
                         ) : (
                           <>
                             <ShieldCheck size={14} />
                             <span>Verify</span>
                           </>
                         )}
                       </button>
                       <button 
                         onClick={() => handleEditProfessional(client)}
                         className="flex-1 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
                       >
                         <Edit2 size={14} />
                         <span>Edit</span>
                       </button>
                    </div>
                  </motion.div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center px-8">
                     <ShieldCheck size={48} className="text-slate-200 mb-4" />
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No {profCategory === 'all' ? 'professionals' : profCategory} seeking verification</p>
                  </div>
                )}
             </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <motion.div 
                layout
                key={item.id}
                onClick={() => handleEditItem(item)}
                className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:bg-slate-50"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden">
                  {item.avatar ? (
                    <img src={item.avatar} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <BriefcaseMedical className="text-slate-300" size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate uppercase tracking-tight leading-none">{item.name || item.title}</h4>
                    {(item.isVerified || item.isUserAccount) && (
                      <div className="bg-blue-600 text-white p-0.5 rounded-full" title="Verified Professional Account">
                        <ShieldCheck size={10} />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                    {activeTab === 'doctors' ? `${item.specialty} • ${item.currentHospital || 'Verified Clinician'}` : 
                     activeTab === 'nurses' ? `${item.specialty} • ${item.currentHospital || 'Nursing Care'}` : 
                     activeTab === 'labs' ? `${item.category} • Diagnostic` :
                     activeTab === 'notifications' ? 'Broadcast Message' :
                     `${item.category} • Rs. ${item.price}`}
                  </p>
                  <div className="flex gap-2 mt-2">
                     <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                       {activeTab === 'pharmacy' ? item.dose : 
                        activeTab === 'notifications' ? dayjs(item.createdAt?.toDate()).format('D MMM') :
                        `${item.experience || 0} Yrs Exp`}
                     </span>
                     <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                       {activeTab === 'notifications' ? 'GLOBAL' : `Rs. ${item.ratePerSession || item.fee || item.price}`}
                     </span>
                  </div>
                </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(item.id);
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center px-8">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
                <ShieldAlert size={32} />
              </div>
              <h4 className="font-bold text-slate-900 uppercase tracking-tight">No Entries Found</h4>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">No results match your current search criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  {editingId ? 'Update' : 'Register'} {activeTab === 'pharmacy' ? 'Medication' : activeTab === 'notifications' ? 'Broadcast' : activeTab === 'labs' ? 'Diagnostic Test' : activeTab === 'professionals' ? 'Professional' : activeTab.slice(0, -1)}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingId(null);
                    setFormData({});
                  }}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                {(activeTab === 'professionals' || formData.isUserAccount) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                        {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-slate-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{formData.name}</h4>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">
                          {formData.providerType || (formData.role === 'lab' ? 'Lab Center' : 'Provider')} • {formData.email}
                        </p>
                        <div className="flex gap-2 mt-2">
                           <span className={clsx(
                             "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                             formData.providerInfo?.isVerified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                           )}>
                             {formData.providerInfo?.isVerified ? 'Verified' : 'Pending Verification'}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Specialty / Title</label>
                        <input required type="text" value={formData.specialty || formData.providerInfo?.specialty || ''} onChange={(e) => setFormData({...formData, specialty: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Experience (Years)</label>
                        <input required type="number" value={formData.experience || formData.providerInfo?.experience || 0} onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Consultation Fee</label>
                        <input required type="number" value={formData.consultationFee || formData.providerInfo?.consultationFee || 0} onChange={(e) => setFormData({...formData, consultationFee: parseFloat(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">License Number</label>
                        <input required type="text" value={formData.licenseNumber || formData.providerInfo?.licenseNumber || ''} onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Profile Bio</label>
                      <textarea value={formData.bio || formData.providerInfo?.bio || ''} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500/20" placeholder="Briefly describe the professional portfolio..." />
                    </div>

                    {(editingUser?.providerType === 'doctor' || formData.providerType === 'doctor') && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1 italic">Clinical Qualifications</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Education</label>
                            <input type="text" value={formData.education || formData.providerInfo?.education || ''} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Affiliated Hospitals</label>
                            <input 
                              type="text" 
                              placeholder="Bir, Om, etc (Comma separated)"
                              value={Array.isArray(formData.affiliatedHospitals || formData.providerInfo?.affiliatedHospitals) ? (formData.affiliatedHospitals || formData.providerInfo?.affiliatedHospitals).join(', ') : (formData.affiliatedHospitals || formData.providerInfo?.affiliatedHospitals || '')} 
                              onChange={(e) => setFormData({...formData, affiliatedHospitals: e.target.value.split(',').map((s: string) => s.trim())})} 
                              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(editingUser?.role === 'lab' || formData.role === 'lab') && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-1 italic">Laboratory Diagnostics Info</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Company Registration #</label>
                            <input type="text" value={formData.companyRegNumber || formData.providerInfo?.companyRegNumber || ''} onChange={(e) => setFormData({...formData, companyRegNumber: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Lead Tech</label>
                              <input type="text" value={formData.technicianName || formData.providerInfo?.technicianDetails?.name || ''} onChange={(e) => setFormData({...formData, technicianName: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">License</label>
                              <input type="text" value={formData.technicianLicense || formData.providerInfo?.technicianDetails?.licenseId || ''} onChange={(e) => setFormData({...formData, technicianLicense: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <>
                    <div className="flex flex-col items-center justify-center py-8 bg-violet-50/50 rounded-[32px] border border-violet-100 mb-8 overflow-hidden relative">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                       <div className="w-20 h-20 bg-violet-600 text-white rounded-[28px] flex items-center justify-center mb-4 shadow-2xl shadow-violet-600/20 rotate-3 transition-transform hover:rotate-0">
                         <Megaphone size={36} strokeWidth={2.5} />
                       </div>
                       <h4 className="text-sm font-black text-violet-900 uppercase tracking-widest">Global Broadcast</h4>
                       <p className="text-[10px] text-violet-400 font-bold mt-1 uppercase tracking-tighter italic">Broadcasting to all active users</p>
                    </div>

                    <div className="space-y-5">
                      <div className="group">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-2 tracking-widest transition-colors group-focus-within:text-violet-500">Alert Title</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.title || ''} 
                          onChange={(e) => setFormData({...formData, title: e.target.value})} 
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold focus:bg-white focus:border-violet-500/10 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-900 placeholder:text-slate-300" 
                          placeholder="e.g. System Maintenance or Free Health Check" 
                        />
                      </div>

                      <div className="group">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-2 tracking-widest transition-colors group-focus-within:text-violet-500">Message Payload</label>
                        <textarea 
                          required 
                          value={formData.message || ''} 
                          onChange={(e) => setFormData({...formData, message: e.target.value})} 
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold focus:bg-white focus:border-violet-500/10 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-900 placeholder:text-slate-300 min-h-[160px] resize-none" 
                          placeholder="Craft your announcement message here. Keep it concise and impactful..." 
                        />
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-amber-400">
                            <ShieldAlert size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-white font-black uppercase tracking-widest leading-none">Protocol Check</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1.5 leading-relaxed uppercase">Saving this will push an instant live notification to all users and update their Health Matrix.</p>
                          </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full translate-x-12 translate-y-12 blur-xl" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'labs' && !formData.isUserAccount && (
                  <>
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-6">
                      <FlaskConical size={32} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Test Name Portfolio</label>
                        <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. CBC / Lipid Profile" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Lab Category</label>
                        <select required value={formData.category || 'blood'} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 appearance-none">
                          <option value="blood">Blood Analysis</option>
                          <option value="urine">Urine Analysis</option>
                          <option value="imaging">Imaging / X-Ray</option>
                          <option value="swab">Pathology / Swab</option>
                          <option value="general">General Checkup</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Diagnostic Scope</label>
                      <textarea required value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 min-h-[100px]" placeholder="Briefly describe what this test detects and requirements (e.g. fasting)..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Base Fee (Rs)</label>
                        <input required type="number" value={formData.fee || ''} onChange={(e) => setFormData({...formData, fee: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Turnaround Time</label>
                        <input type="text" value={formData.tat || ''} onChange={(e) => setFormData({...formData, tat: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. 24 Hours" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'doctors' && !formData.isUserAccount && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-4 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                         <Stethoscope size={32} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest leading-none">Manual Registry</h4>
                        <p className="text-[9px] text-blue-400 font-bold mt-1.5 uppercase leading-relaxed italic">Entry will appear in users' consult section alongside verified providers.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-blue-500">Professional Name</label>
                        <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900" placeholder="e.g. Dr. Jane Smith" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-blue-500">Domain / Specialty</label>
                        <select 
                          required 
                          value={formData.specialty || ''} 
                          onChange={(e) => setFormData({...formData, specialty: e.target.value})} 
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer text-slate-900"
                        >
                          <option value="">Select Specialization</option>
                          {DOCTOR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Operational Status</label>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, available: !formData.available})}
                          className={clsx(
                            "w-full rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest transition-all border-2",
                            formData.available !== false 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                              : "bg-rose-50 border-rose-200 text-rose-600"
                          )}
                        >
                          {formData.available !== false ? '● Online Now' : '○ Offline / Busy'}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest uppercase">Service Mode</label>
                        <div className="flex gap-2">
                           {['tele', 'home'].map((type) => (
                             <button
                               key={type}
                               type="button"
                               onClick={() => {
                                 const currentTypes = formData.types || [];
                                 const nextTypes = currentTypes.includes(type)
                                   ? currentTypes.filter((t: string) => t !== type)
                                   : [...currentTypes, type];
                                 setFormData({ ...formData, types: nextTypes });
                               }}
                               className={clsx(
                                 "flex-1 py-3.5 rounded-2xl border-2 transition-all text-[9px] font-black uppercase tracking-widest shadow-sm",
                                 (formData.types || []).includes(type)
                                   ? "bg-slate-900 border-slate-900 text-white"
                                   : "bg-white border-slate-100 text-slate-400"
                               )}
                             >
                               {type}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-blue-500">Institutional Affiliation</label>
                        <input required type="text" value={formData.currentHospital || ''} onChange={(e) => setFormData({...formData, currentHospital: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900" placeholder="Current Hospital / Clinic" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-blue-500">Academic Credentials</label>
                        <input required type="text" value={formData.qualifications || ''} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900" placeholder="e.g. MBBS, MD (Cardiology)" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Clinical Hours</label>
                      <input type="text" value={formData.workingHours || ''} onChange={(e) => setFormData({...formData, workingHours: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900" placeholder="e.g. 10:00 AM - 04:00 PM" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Experience (Years)</label>
                        <input required type="number" value={formData.experience || ''} onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Consultation Fee (NPR)</label>
                        <input required type="number" value={formData.ratePerSession || formData.consultationFee || formData.fee || ''} onChange={(e) => setFormData({...formData, ratePerSession: parseFloat(e.target.value), consultationFee: parseFloat(e.target.value), fee: parseFloat(e.target.value)})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-2 tracking-widest transition-colors focus-within:text-blue-500">Professional Bio</label>
                      <textarea 
                        value={formData.bio || ''} 
                        onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 min-h-[140px] resize-none" 
                        placeholder="Detail the clinician's background, publications, and clinical focus area..." 
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'nurses' && !formData.isUserAccount && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-4 bg-rose-50/50 rounded-3xl border border-rose-100/50">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                         <HeartPulse size={32} className="text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest leading-none">Nursing Registry</h4>
                        <p className="text-[9px] text-rose-400 font-bold mt-1.5 uppercase leading-relaxed italic">Manual entries for home nursing and institutional care practitioners.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-rose-500">Professional Name</label>
                        <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-rose-500/10 focus:ring-4 focus:ring-rose-500/5 transition-all text-slate-900" placeholder="e.g. Sr. Emma" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-rose-500">Domain / Specialty</label>
                        <select 
                          required 
                          value={formData.specialty || ''} 
                          onChange={(e) => setFormData({...formData, specialty: e.target.value})} 
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-rose-500/10 focus:ring-4 focus:ring-rose-500/5 transition-all appearance-none cursor-pointer text-slate-900"
                        >
                          <option value="">Select Domain</option>
                          {NURSE_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Experience (Years)</label>
                        <input required type="number" value={formData.experience || ''} onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-rose-500/10 focus:ring-4 focus:ring-rose-500/5 transition-all text-slate-900" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest">Operational Status</label>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, available: !formData.available})}
                          className={clsx(
                            "w-full rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest transition-all border-2",
                            formData.available !== false 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                              : "bg-rose-50 border-rose-200 text-rose-600"
                          )}
                        >
                          {formData.available !== false ? '● Online Now' : '○ Offline / Busy'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-rose-500">Daily Base Rate (NPR)</label>
                        <input required type="number" value={formData.ratePerSession || formData.fee || ''} onChange={(e) => setFormData({...formData, ratePerSession: parseFloat(e.target.value), fee: parseFloat(e.target.value)})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-rose-500/10 focus:ring-4 focus:ring-rose-500/5 transition-all text-slate-900" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1 tracking-widest transition-colors focus-within:text-rose-500">Credentials & Certs</label>
                        <input required type="text" value={formData.qualifications || ''} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-rose-500/10 focus:ring-4 focus:ring-rose-500/5 transition-all text-slate-900" placeholder="e.g. B.Sc Nursing, NHPC Licensed" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pharmacy' && (
                  <>
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6">
                      <BriefcaseMedical size={32} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Medication Identity</label>
                        <input required type="text" value={formData.name || formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" placeholder="Amoxicillin" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Pharmaceutical Brand</label>
                        <input required type="text" value={formData.brand || ''} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" placeholder="GSK / Generic" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Dosage Spec</label>
                        <input required type="text" value={formData.dose || ''} onChange={(e) => setFormData({...formData, dose: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" placeholder="500mg" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Inventory Category</label>
                        <select 
                          required 
                          value={formData.category || 'OTC (Over the Counter)'} 
                          onChange={(e) => setFormData({...formData, category: e.target.value})} 
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                        >
                          {MEDICINE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Unit Retail Price (Rs)</label>
                      <input required type="number" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-lg" />
                    </div>
                  </>
                )}

                <button 
                  disabled={isProcessing}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] mt-8 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      {activeTab === 'notifications' ? <Megaphone size={20} /> : <Save size={20} />}
                      {editingId ? 'UPDATE RECORD' : activeTab === 'notifications' ? 'BROADCAST MESSAGE' : 'SAVE RECORD'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Record?</h3>
            <p className="text-xs text-slate-400 font-medium mb-8">This action cannot be undone. Are you sure you want to permanently remove this entry?</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                disabled={isProcessing}
                className="py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={() => handleDeleteItem(deleteConfirmId)}
                disabled={isProcessing}
                className="py-4 bg-rose-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : 'Delete Now'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

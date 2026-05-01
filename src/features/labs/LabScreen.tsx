import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Search, MapPin, Clock, Star, FlaskConical, Filter, Beaker, Thermometer, ShieldCheck, CheckCircle2, History, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import dayjs from '../../utils/date';
import { collection, addDoc, serverTimestamp, getDocs, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';


const CATEGORIES = [
  { id: 'all', label: 'All Tests', icon: FlaskConical },
  { id: 'blood', label: 'Blood Tests', icon: Beaker },
  { id: 'urine', label: 'Urine Tests', icon: Thermometer },
  { id: 'swab', label: 'Swab Tests', icon: FlaskConical },
];

export default function LabScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [step, setStep] = useState<'selection' | 'scheduling' | 'success'>('selection');
  const [bookingDate, setBookingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bookingTime, setBookingTime] = useState('08:00 AM');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbTests, setDbTests] = useState<any[]>([]);
  const { user } = useAuthStore();
  const { addEvent } = useCalendarStore();
  const navigate = useNavigate();
  const browserLocation = useLocation();

  useEffect(() => {
    // Enable fetching for everyone
    const qManual = collection(db, 'lab_tests');
    const qUsers = query(
      collection(db, 'users'),
      where('role', '==', 'lab')
    );

    let unsubManual = () => {};
    let unsubUsers = () => {};

    const syncLabs = () => {
      let manualData: any[] = [];
      let userData: any[] = [];

      const combine = () => {
        const mergedMap = new Map();
        manualData.forEach(d => {
          if (d.is_approved !== false && d.isVerified !== false) {
             mergedMap.set(d.id, d);
          }
        });
        userData.forEach(u => {
          const isApprove = u.is_approved === true || u.isVerified === true || u.providerInfo?.isVerified === true;
          if (isApprove) {
             mergedMap.set(u.id, u);
          }
        });
        setDbTests(Array.from(mergedMap.values()));
        setIsLoading(false);
      };

      unsubManual = onSnapshot(qManual, (snap) => {
        manualData = snap.docs.map(doc => {
          const d = doc.data() as any;
          return { 
            id: doc.id, 
            ...d, 
            name: d.name || d.title || 'Lab Test',
            description: d.description || 'Verified diagnostic service.',
            fee: d.fee || d.price || 0,
            category: d.category || 'Diagnostic',
            isVerified: true,
            is_approved: true
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'lab_tests'));

      unsubUsers = onSnapshot(qUsers, (snap) => {
        userData = snap.docs.map(doc => {
          const u = doc.data() as any;
          return {
            id: doc.id,
            name: u.name || u.providerInfo?.labName || 'Private Laboratory',
            description: u.providerInfo?.bio || 'Verified diagnostic services provider.',
            fee: u.providerInfo?.consultationFee || 500,
            category: 'Diagnostic',
            isUserAccount: true,
            isVerified: u.providerInfo?.isVerified || u.isVerified || u.is_approved,
            is_approved: u.is_approved || u.isVerified || u.providerInfo?.isVerified,
            avatar: u.avatar
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));
    };

    syncLabs();

    return () => {
      unsubManual();
      unsubUsers();
    };
  }, [user]);

  const filteredTests = dbTests.filter(test => {
    const matchesCategory = activeCategory === 'all' || test.category === activeCategory;
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (test.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBookTest = async () => {
    if (!user) {
      navigate('/profile', { state: { from: browserLocation } });
      return;
    }
    if (!selectedTest || !location) {
      alert('Please select a test and provide a location.');
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile if location is new
      if (location && location !== user?.address) {
        await updateDoc(doc(db, 'users', user.id), {
          address: location,
          updatedAt: serverTimestamp()
        });
      }

      // 1. Add to Firestore lab_bookings
      const bookingData = {
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Anonymous',
        testId: selectedTest.id,
        testName: selectedTest.name,
        category: selectedTest.category || 'lab',
        date: bookingDate,
        time: bookingTime,
        location,
        status: 'pending',
        fee: selectedTest.fee || 0,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'lab_bookings'), bookingData);

      // 2. Add to Calendar (to show on home and calendar screens)
      await addEvent({
        title: `Lab: ${selectedTest.name}`,
        date: bookingDate,
        time: bookingTime,
        type: 'personal',
        category: 'lab_test',
        description: `Home sample collection at ${location}`,
        status: 'pending'
      });

      setStep('success');
    } catch (error) {
      console.error('Error booking lab test:', error);
      handleFirestoreError(error, OperationType.WRITE, 'lab_bookings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-600/5 rounded-full blur-3xl -mr-80 -mt-80" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-3xl -ml-40 -mb-40" />

      <div className="p-5 flex flex-col gap-6 relative z-10 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Lab Diagnostics</h1>
          <div className="w-12" />
        </div>

        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div
              key="selection-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-600 transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Search tests (e.g. Blood sugar, Thyroid)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-3xl py-6 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-sky-500/5 transition-all outline-none"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={clsx(
                      "flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 shrink-0",
                      activeCategory === cat.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                        : "bg-white text-slate-400 border-slate-100"
                    )}
                  >
                    <cat.icon size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Tests Grid */}
              <div className="grid grid-cols-1 gap-4">
                {filteredTests.map(test => (
                  <motion.div
                    layout
                    key={test.id}
                    className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-5 group hover:shadow-2xl transition-all cursor-pointer"
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center relative">
                          {test.category === 'blood' ? <Beaker size={20} /> : test.category === 'urine' ? <Thermometer size={20} /> : <FlaskConical size={20} />}
                          {test.isVerified && (
                             <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full border-2 border-white">
                               <ShieldCheck size={8} />
                             </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 mb-0.5">{test.isUserAccount ? 'Verified Lab' : test.category + ' Log'}</p>
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">{test.name}</h4>
                        </div>
                      </div>
                      <div className="p-2 text-slate-300 group-hover:text-slate-900 transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 font-medium leading-relaxed italic opacity-80">
                      {test.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Test Fee</p>
                        <p className="text-xl font-black text-slate-900">Rs. {test.fee}</p>
                      </div>
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setSelectedTest(test);
                           setStep('scheduling');
                         }}
                         className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                      >
                         Book Now
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'scheduling' && (
            <motion.div
              key="scheduling-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-2xl shadow-sky-100 flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-[32px] flex items-center justify-center mb-6">
                    <CalendarIcon size={32} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Schedule Collection</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Test: {selectedTest?.name}</p>
                 
                 <div className="w-full h-px bg-slate-50 my-8" />

                 <div className="w-full space-y-8">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block text-left px-2">Collection Address</label>
                      <div className="relative group">
                         <div className="absolute inset-0 bg-sky-500/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                         <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                         <input 
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter home location for sample collection..."
                            className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-sky-500/10 outline-none relative z-10"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block text-left px-2">Preferred Date</label>
                        <input 
                          type="date"
                          value={bookingDate}
                          min={dayjs().format('YYYY-MM-DD')}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-white border border-slate-100 rounded-3xl py-5 px-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-sky-500/10 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block text-left px-2">Preferred Time</label>
                        <select
                           value={bookingTime}
                           onChange={(e) => setBookingTime(e.target.value)}
                           className="w-full bg-white border border-slate-100 rounded-3xl py-5 px-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-sky-500/10 outline-none appearance-none"
                        >
                           {['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'].map(t => (
                             <option key={t} value={t}>{t}</option>
                           ))}
                        </select>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                  onClick={() => setStep('selection')}
                  className="flex-1 py-6 rounded-[28px] bg-white border border-slate-100 font-black text-slate-400 text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                 >
                   Back
                 </button>
                 <button 
                  disabled={!location || isLoading}
                  onClick={handleBookTest}
                  className="flex-[2] py-6 rounded-[28px] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {isLoading && <Loader2 className="animate-spin" size={20} />}
                   {isLoading ? 'Finalizing...' : 'Confirm Booking'}
                 </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-20 bg-emerald-50 rounded-[60px] border-4 border-dashed border-emerald-200"
            >
               <div className="w-24 h-24 bg-white text-emerald-500 rounded-full flex items-center justify-center shadow-xl mb-8">
                  <CheckCircle2 size={48} />
               </div>
               <h2 className="text-3xl font-black text-emerald-900 uppercase tracking-tight">Booking Initiated</h2>
               <p className="text-sm text-emerald-600 font-bold mt-4 px-12 leading-relaxed uppercase tracking-widest">Our lab technician will arrive at the scheduled time to collect your sample.</p>
               
               <button 
                onClick={() => navigate('/')}
                className="mt-12 bg-white text-emerald-600 px-12 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
               >
                 Back to Home
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

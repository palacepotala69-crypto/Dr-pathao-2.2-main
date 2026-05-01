import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HeartPulse, ChevronLeft, MapPin, Clock, Star, ShieldCheck, CheckCircle2, ChevronRight, Loader2, Database, BriefcaseMedical } from 'lucide-react';
import { clsx } from 'clsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import dayjs from '../../utils/date';
import { collection, addDoc, getDocs, serverTimestamp, writeBatch, doc, onSnapshot, updateDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

export default function NursingScreen() {
  const [step, setStep] = useState<'details' | 'selection' | 'success'>('details');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('1 Week');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedNurse, setSelectedNurse] = useState<any>(null);
  const [nurses, setNurses] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const { user } = useAuthStore();
  const { addEvent } = useCalendarStore();
  const navigate = useNavigate();
  const locationState = useLocation();

  useEffect(() => {
    // Enable fetching for guests
    const qUsers = query(
      collection(db, 'users'), 
      where('role', 'in', ['provider', 'lab'])
    );

    const qManual = collection(db, 'nurses');

    let unsubUsers = () => {};
    let unsubManual = () => {};

    const syncNurses = () => {
      let userData: any[] = [];
      let manualData: any[] = [];

      const combine = () => {
        const mergedMap = new Map();
        
        // Manual nurses
        manualData.forEach(n => {
           if (n.is_approved !== false && n.isVerified !== false) {
             mergedMap.set(n.id, n);
           }
        });
        
        // User nurses
        userData.forEach(u => {
           const isApprove = u.is_approved === true || u.isVerified === true || u.providerInfo?.isVerified === true;
           if (isApprove) {
             mergedMap.set(u.id, u);
           }
        });

        setNurses(Array.from(mergedMap.values()));
        setIsFetching(false);
      };

      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        userData = snapshot.docs.map(doc => {
          const u = doc.data() as any;
          return {
            id: doc.id,
            name: u.name,
            qualification: u.providerInfo?.qualification || u.providerInfo?.qualifications,
            exp: `${u.providerInfo?.experience || 0} Yrs`,
            experience: u.providerInfo?.experience,
            rating: 4.8,
            fee: u.providerInfo?.consultationFee || u.providerInfo?.ratePerSession || 0,
            specialty: u.providerInfo?.specialty || 'Nursing Care',
            available: u.providerInfo?.available ?? true,
            avatar: u.avatar,
            isUserAccount: true,
            isVerified: true
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

      unsubManual = onSnapshot(qManual, (snapManual) => {
        manualData = snapManual.docs.map(doc => {
          const n = doc.data() as any;
          return { 
            id: doc.id, 
            ...n,
            name: n.name || 'Private Nurse',
            specialty: n.specialty || 'Nursing Care',
            rating: n.rating || 4.6,
            available: n.available ?? true,
            fee: n.fee || n.ratePerSession || 0,
            exp: n.exp || `${n.experience || 0} Yrs`,
            isVerified: true,
            is_approved: true
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'nurses'));
    };

    syncNurses();

    return () => {
      unsubUsers();
      unsubManual();
    };
  }, [user]);

  const durations = ['1 Day', '3 Days', '1 Week', '2 Weeks', '1 Month'];

  const handleBooking = async () => {
    if (!user) {
      navigate('/profile', { state: { from: locationState } });
      return;
    }
    try {
      // Update user profile if location is new
      if (location && location !== user?.address) {
        await updateDoc(doc(db, 'users', user.id), {
          address: location,
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'nursing_bookings'), {
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Anonymous User',
        nurseId: selectedNurse.id,
        nurseName: selectedNurse.name,
        location,
        duration,
        startDate,
        status: 'pending',
        createdAt: serverTimestamp(),
        totalFee: selectedNurse.ratePerSession || selectedNurse.fee
      });

      // Add to calendar
      await addEvent({
        title: `Nursing: ${selectedNurse.name}`,
        date: startDate,
        time: '08:00 AM', // Default start time
        type: 'personal',
        category: 'appointment',
        description: `Nursing care start at ${location} for ${duration}`,
        status: 'pending'
      });

      setStep('success');
    } catch (error) {
      console.error('Nursing booking error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'nursing_bookings');
    }
  };

  return (
    <div className="p-5 flex flex-col gap-6 min-h-screen relative pb-12">
      <AnimatePresence mode="wait">
        {step === 'details' && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="flex items-center gap-4">
               <button onClick={() => window.history.back()} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
               <h1 className="text-xl font-bold text-slate-900">Nursing Requirements</h1>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[32px] p-6 text-white shadow-xl shadow-rose-100 flex items-center gap-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
               <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shrink-0">
                  <HeartPulse size={28} />
               </div>
               <div className="relative z-10">
                  <h3 className="font-black uppercase tracking-tight text-lg">Hospital Care at Home</h3>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Certified Professional Nurses</p>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Service Location</label>
                  <div className="relative group">
                     <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                     <input 
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Detailed address with house no..."
                        className="w-full bg-white border border-slate-100 rounded-[24px] py-5 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all outline-none"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Start Date</label>
                     <div className="relative">
                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                           type="date"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           className="w-full bg-white border border-slate-100 rounded-[24px] py-5 pl-14 pr-4 text-xs font-bold shadow-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all outline-none"
                        />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Duration</label>
                     <select 
                       value={duration}
                       onChange={(e) => setDuration(e.target.value)}
                       className="w-full bg-white border border-slate-100 rounded-[24px] py-5 px-6 text-sm font-bold shadow-sm appearance-none outline-none focus:ring-4 focus:ring-rose-500/5"
                     >
                       {durations.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <div className="flex items-center gap-3 text-slate-900">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Quality Guarantee</span>
               </div>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                 All our nurses are background verified and hold valid NHPC licenses for home medical assistance.
               </p>
            </div>

            <div className="mt-auto">
               <button 
                  disabled={!location.trim()}
                  onClick={() => setStep('selection')}
                  className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold shadow-xl active:scale-95 transition-all disabled:opacity-50"
               >
                  Find Available Nurses
               </button>
            </div>
          </motion.div>
        )}

        {step === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-4">
               <button onClick={() => setStep('details')} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
               <div>
                 <h1 className="text-xl font-bold text-slate-900">Select Nurse</h1>
                 <p className="text-xs text-slate-400 font-medium">{location.split(',')[0]} • {duration}</p>
               </div>
            </div>

            <div className="flex flex-col gap-4">
               {isFetching ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 className="animate-spin text-rose-600" size={40} />
                    <p className="text-sm font-bold uppercase tracking-widest">Scanning Registry...</p>
                  </div>
               ) : nurses.length > 0 ? (
                 nurses.map(nurse => (
                   <button
                    key={nurse.id}
                    onClick={() => {
                      if(nurse.available) setSelectedNurse(nurse);
                    }}
                    className={clsx(
                      "bg-white p-5 rounded-[32px] border transition-all text-left flex flex-col gap-4",
                      selectedNurse?.id === nurse.id ? "border-rose-500 ring-4 ring-rose-500/10 shadow-md" : "border-slate-100 shadow-sm"
                    )}
                   >
                     <div className="flex items-center gap-4 w-full">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-white shadow-sm overflow-hidden">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nurse.name}`} alt={nurse.name} />
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-900">{nurse.name}</h4>
                              <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                                 <Star size={10} fill="currentColor" />
                                 <span className="text-[10px] font-bold">{nurse.rating}</span>
                              </div>
                           </div>
                           <p className="text-xs text-rose-600 font-bold mt-1">{nurse.specialty}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{nurse.experience || nurse.exp} Experience</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-4 border-t border-slate-50 w-full">
                        <div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">Base Fee</p>
                           <p className="font-bold text-slate-900">Rs. {nurse.ratePerSession || nurse.fee}</p>
                        </div>
                        {!nurse.available && (
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-3 py-1.5 rounded-full font-bold uppercase">Currently Busy</span>
                        )}
                     </div>
                   </button>
                 ))
               ) : (
                  <div className="py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center px-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                      <HeartPulse size={32} />
                    </div>
                    <h4 className="font-bold text-slate-900 uppercase">Registry Empty</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-8 font-medium">No professional nurses are currently registered in our database.</p>
                  </div>
               )}
            </div>

            <button 
              disabled={!selectedNurse}
              onClick={handleBooking}
              className="w-full bg-rose-600 text-white py-5 rounded-[24px] font-bold shadow-xl shadow-rose-100 active:scale-95 transition-all mt-4 disabled:opacity-50"
            >
              Confirm Booking
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-6"
          >
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[40px] flex items-center justify-center shadow-xl shadow-emerald-50/50">
               <CheckCircle2 size={48} />
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-900">Booking Confirmed!</h1>
               <p className="text-slate-500 text-sm mt-2 px-8 font-medium">Your request for {selectedNurse?.name} has been received. Our team will contact you shortly to finalize the schedule.</p>
            </div>
            
            <div className="w-full bg-white border border-slate-100 rounded-[32px] p-6 text-left mt-4">
               <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="text-rose-500" size={20} />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Booking Receipt</span>
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Service</span>
                    <span className="font-bold text-slate-900">Home Nursing</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-bold text-slate-900">{duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Fee</span>
                    <span className="font-bold text-rose-600">Rs. {selectedNurse?.fee}</span>
                  </div>
               </div>
            </div>

            <button onClick={() => window.history.back()} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold shadow-xl mt-8">
               Return Home
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

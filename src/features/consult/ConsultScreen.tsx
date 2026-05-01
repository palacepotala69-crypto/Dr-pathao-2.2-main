import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Star, Clock, MapPin, ChevronLeft, ChevronRight, Stethoscope, Smartphone, Loader2, Database, FlaskConical, Users, HeartPulse, Activity, Brain, Home as HomeIcon } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import dayjs from '../../utils/date';
import { useAuthStore } from '../../store/useAuthStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import DoctorMiniCalendar from '../../components/DoctorMiniCalendar';
import { useReminderStore } from '../../store/useReminderStore';
import { collection, addDoc, getDocs, serverTimestamp, query, where, writeBatch, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

export default function ConsultScreen() {
  const { addEvent } = useCalendarStore();
  const { addMedicine } = useReminderStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'scheduling'>('details');
  const [bookingDate, setBookingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingDuration, setBookingDuration] = useState<'quick' | 'regular'>('regular');
  const [bookingOption, setBookingOption] = useState<'scheduled' | 'asap' | 'queue'>('scheduled');
  const [consultMode, setConsultMode] = useState<'selection' | 'type' | 'symptom' | 'specialty-grid' | 'doctor-list'>('type');
  const [consultType, setConsultType] = useState<'tele' | 'home' | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState('');
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // We allow fetching for everyone now to enable guest browsing
    const qUsers = query(
      collection(db, 'users'), 
      where('role', 'in', ['provider', 'lab'])
    );

    const qDoctors = collection(db, 'doctors');
    const qNurses = collection(db, 'nurses');

    let unsubUsers = () => {};
    let unsubDoctors = () => {};
    let unsubNurses = () => {};

    const syncData = () => {
      let userData: any[] = [];
      let doctorData: any[] = [];
      let nurseData: any[] = [];

      const combine = () => {
        const mergedMap = new Map();
        
        // Add manual doctors (filter by approval if necessary, but usually admin-created = approved)
        doctorData.forEach(d => {
           // Admin-created manual entries are verified/approved by default unless explicitly disabled
           if (d.is_approved !== false && d.isVerified !== false) {
             mergedMap.set(d.id, {
               ...d,
               types: d.types || ['tele', 'home'], // Default to both if missing
               isVerified: true,
               is_approved: true
             });
           }
        });
        
        // Add manual nurses
        nurseData.forEach(n => {
           if (n.is_approved !== false && n.isVerified !== false) {
             mergedMap.set(n.id, {
               ...n,
               types: n.types || ['tele', 'home'], // Default to both if missing
               isVerified: true,
               is_approved: true
             });
           }
        });

        // Add user accounts (must be explicitly verified)
        userData.forEach(u => {
           const isApprove = u.is_approved === true || u.isVerified === true || u.providerInfo?.isVerified === true;
           if (isApprove) {
             mergedMap.set(u.id, u);
           }
        });

        setDoctors(Array.from(mergedMap.values()));
        setIsFetching(false);
      };

      unsubUsers = onSnapshot(qUsers, (snap) => {
        userData = snap.docs.map(doc => {
          const u = doc.data() as any;
          return {
            id: doc.id,
            name: u.name,
            avatar: u.avatar,
            specialty: u.providerInfo?.specialty || u.providerType || (u.role === 'lab' ? 'Laboratory' : 'General'),
            experience: u.providerInfo?.experience || 0,
            rating: u.providerInfo?.rating || u.rating || 4.8,
            consultationFee: u.providerInfo?.consultationFee || 0,
            fee: u.providerInfo?.consultationFee || 0,
            available: u.providerInfo?.available ?? true,
            isVerified: u.providerInfo?.isVerified || u.isVerified || u.is_approved,
            is_approved: u.is_approved || u.isVerified || u.providerInfo?.isVerified,
            providerType: u.providerType?.toLowerCase() || (u.role === 'lab' ? 'lab' : 'provider'),
            bio: u.providerInfo?.bio,
            types: u.providerInfo?.services || u.types || ['tele', 'home'],
            workingHours: u.providerInfo?.workingHours || '09:00 AM - 05:00 PM',
            qualifications: u.providerInfo?.qualification || u.providerInfo?.qualifications,
            isUserAccount: true,
            role: u.role
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

      unsubDoctors = onSnapshot(qDoctors, (snap) => {
        doctorData = snap.docs.map(doc => {
          const d = doc.data() as any;
          return { 
            id: doc.id, 
            ...d, 
            providerType: d.providerType || 'doctor',
            rating: d.rating || 4.7,
            available: d.available ?? true,
            isVerified: true,
            types: d.types || ['tele', 'home'],
            specialty: d.specialty || 'General Physician',
            fee: d.fee || d.consultationFee || d.ratePerSession || 0
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'doctors'));

      unsubNurses = onSnapshot(qNurses, (snap) => {
        nurseData = snap.docs.map(doc => {
          const n = doc.data() as any;
          return { 
            id: doc.id, 
            ...n, 
            providerType: n.providerType || 'nurse',
            rating: n.rating || 4.6,
            available: n.available ?? true,
            isVerified: true,
            types: n.types || ['tele', 'home'],
            specialty: n.specialty || 'Nursing Services',
            fee: n.fee || n.ratePerSession || 0
          };
        });
        combine();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'nurses'));
    };

    syncData();

    return () => {
      unsubUsers();
      unsubDoctors();
      unsubNurses();
    };
    }, [user]);

  const handleConfirmBooking = async () => {
    if (!user) {
      navigate('/profile', { state: { from: location } });
      return;
    }
    if (!selectedDoctor) return;
    
    const baseFee = selectedDoctor.fee || selectedDoctor.consultationFee || selectedDoctor.ratePerSession;
    const finalFee = bookingOption === 'asap' ? baseFee * 2 : baseFee;

    setIsLoading(true);
    try {
      // 0. Update user profile if location is new
      if (consultType === 'home' && userLocation && userLocation !== user?.address) {
        await updateDoc(doc(db, 'users', user!.id), {
          address: userLocation,
          updatedAt: serverTimestamp()
        });
      }

      // 1. Add to global appointments
      await addDoc(collection(db, 'appointments'), {
        doctorId: String(selectedDoctor.id),
        doctorName: selectedDoctor.name,
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Anonymous User',
        userPhone: user?.phone || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        fee: finalFee,
        type: consultType,
        preferredDate: bookingDate,
        preferredTime: bookingTime,
        duration: bookingDuration,
        bookingOption: bookingOption,
        location: consultType === 'home' ? {
          address: userLocation || user?.address || 'Location not provided'
        } : null
      });

      // 2. Add as a Health Reminder for tracking
      if (bookingOption === 'asap' || consultType === 'express') {
        await addMedicine({
          title: `Express Consult: ${selectedDoctor.name}`,
          dosage: `ETA: ${bookingTime}`,
          time: dayjs().format('HH:mm'),
          frequency: 'once' as any,
          displayTime: dayjs().format('hh:mm A'),
          type: 'appointment' as any
        } as any);
      }

      // 3. Add to user personal calendar for unified view
      await addEvent({
        title: `${bookingOption === 'asap' ? 'EXPRESS: ' : ''}Consult: ${selectedDoctor.name} (${bookingDuration === 'quick' ? '< 15m' : '> 15m'})`,
        date: bookingDate,
        time: bookingTime,
        type: 'personal',
        category: 'appointment',
        description: `${bookingOption === 'asap' ? 'EXPRESS PRIORITY - ' : ''}${consultType === 'tele' ? 'Tele-Consultation' : 'Home Consultation'} with ${selectedDoctor.specialty}. Duration: ${bookingDuration === 'quick' ? 'Quick Consult (< 15 mins)' : 'Regular Consult (> 15 mins)'}`,
        status: 'pending'
      });

      setSelectedDoctor(null);
      setBookingStep('details');
      setShowBookingSuccess(true);
    } catch (error) {
      console.error('Booking error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const commonSymptoms = [
    'Fever', 'Headache', 'Cough', 'Cold', 'Stomach Pain', 'Back Pain', 'Skin Rash', 'Toothache', 'Muscle Pain', 'Eye Irritation'
  ];

  const generateTimeSlots = (hours: string) => {
    // Simple parser for "HH:mm AM/PM - HH:mm AM/PM"
    try {
      const parts = hours.split('-').map(p => p.trim());
      if (parts.length !== 2) return ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
      
      const start = dayjs(`2024-01-01 ${parts[0]}`, 'YYYY-MM-DD hh:mm A');
      const end = dayjs(`2024-01-01 ${parts[1]}`, 'YYYY-MM-DD hh:mm A');
      
      const slots = [];
      let current = start;
      while (current.isBefore(end) || current.isSame(end)) {
        slots.push(current.format('hh:mm A'));
        current = current.add(1, 'hour');
      }
      return slots.length > 0 ? slots : ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    } catch (e) {
      return ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    }
  };

  const specialtyCategories = [
    { label: 'General Physician', id: 'General', icon: Stethoscope },
    { label: 'Nursing Services', id: 'Nursing', icon: HeartPulse },
    { label: 'Physiotherapist', id: 'Physio', icon: HeartPulse },
    { label: 'Gynecologist', id: 'General', icon: Users },
    { label: 'Cardiologist', id: 'Heart', icon: Activity },
    { label: 'Dentist', id: 'Dental', icon: FlaskConical },
    { label: 'Skin Specialist', id: 'Skin', icon: Star },
    { label: 'Child Specialist', id: 'Child', icon: Users },
    { label: 'Lab & Diagnostic', id: 'Lab', icon: FlaskConical },
    { label: 'Psychologist', id: 'Psych', icon: Brain },
    { label: 'Urologist', id: 'Urology', icon: Database },
  ];

  const symptomMapping: Record<string, string> = {
    'headache': 'General',
    'fever': 'General',
    'cold': 'General',
    'cough': 'General',
    'tooth': 'Dental',
    'gum': 'Dental',
    'heart': 'Heart',
    'chest': 'Heart',
    'skin': 'Skin',
    'rash': 'Skin',
    'baby': 'Child',
    'child': 'Child',
    'eye': 'Eye',
    'vision': 'Eye',
    'muscle': 'Physio',
    'bone': 'Physio',
    'joint': 'Physio',
    'urine': 'Urology'
  };

  const handleSymptomAnalysis = () => {
    const text = symptomText.toLowerCase();
    let foundSpecialty = 'All';
    
    for (const [key, spec] of Object.entries(symptomMapping)) {
      if (text.includes(key)) {
        foundSpecialty = spec;
        break;
      }
    }
    
    setActiveSpecialty(foundSpecialty);
    setConsultMode('doctor-list');
  };

  const filteredDoctors = doctors.filter(doc => {
    // REQUIRED: Provider must be APPROVED to be seen by users
    const isApproved = doc.is_approved === true || doc.isVerified === true || doc.providerInfo?.isVerified === true;
    if (!isApproved) return false;

    if (!consultType) return true;
    
    const lowerType = consultType.toLowerCase();
    const isTeleSearch = lowerType.includes('tele');
    const isHomeSearch = lowerType.includes('home');
    
    // Required Mode: If explicitly tagged, must match. If untagged (manual), show in both.
    const supportsMode = !doc.types || (isTeleSearch && doc.types.includes('tele')) || (isHomeSearch && doc.types.includes('home'));
    
    if (!supportsMode) return false;
    
    // Flexible Role Mapping
    const docRole = (doc.role || doc.providerType || 'doctor').toLowerCase();
    const docSpecialty = (doc.specialty || '').toLowerCase();

    if (isTeleSearch) {
       // Tele search shows doctors, labs, and specialized clinical staff
       const isEligible = docRole.includes('doctor') || docRole.includes('lab') || docSpecialty.includes('doctor') || !doc.isUserAccount;
       if (!isEligible) return false;
    }
    
    if (isHomeSearch) {
       // Home search shows doctors and nurses
       const isEligible = docRole.includes('doctor') || docRole.includes('nurse') || docSpecialty.includes('doctor') || docSpecialty.includes('nurse') || !doc.isUserAccount;
       if (!isEligible) return false;
    }

    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeSpecialty === 'All') return true;
    // Map specialist names to category names
    const specialtyMap: Record<string, string> = {
      'General Physician': 'General',
      'Gynecologist': 'General',
      'Physician': 'General',
      'Medical Officer': 'General',
      'Cardiologist': 'Heart',
      'Dentist': 'Dental',
      'Skin Specialist': 'Skin',
      'Dermatologist': 'Skin',
      'Child Specialist': 'Child',
      'Pediatrician': 'Child',
      'Ophthalmologist': 'Eye',
      'Physiotherapist': 'Physio',
      'Psychologist': 'Psych',
      'Psychiatrist': 'Psych',
      'Urologist': 'Urology',
      'Nurse': 'Nursing',
      'Nursing Services': 'Nursing',
      'Lab Owner': 'Lab',
      'Laboratory': 'Lab',
      'Lab & Diagnostic': 'Lab',
      'Radiologist': 'Lab'
    };
    
    const mappedSpecialty = specialtyMap[doc.specialty] || doc.specialty;
    const specialtyFilter = activeSpecialty.toLowerCase();
    
    const docTypeNormalized = (doc.providerType || '').toLowerCase();
    
    return mappedSpecialty === activeSpecialty || 
           docTypeNormalized === specialtyFilter || 
           (specialtyFilter === 'nursing' && docTypeNormalized === 'nurse') ||
           (specialtyFilter === 'lab' && (docTypeNormalized === 'lab' || doc.role === 'lab')) ||
           (specialtyFilter === 'general' && docTypeNormalized === 'doctor');
  });

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-3xl -ml-48 -mb-48" />

      <div className="p-5 flex flex-col gap-6 relative z-10 flex-1">
        {/* Booking Success Modal */}
        <AnimatePresence>
          {showBookingSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                 onClick={() => setShowBookingSuccess(false)}
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl text-center overflow-hidden"
               >
                 <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                 <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[38px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Activity size={48} strokeWidth={1.5} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                   {consultType === 'home' ? 'Home Visit Confirmed!' : 'Consultation Scheduled!'}
                 </h3>
                 <p className="text-sm text-slate-400 font-bold mt-4 leading-relaxed uppercase tracking-tighter opacity-70">
                   {consultType === 'home' 
                    ? `Be ready for the doctor at your doorstep at ${bookingTime}.`
                    : 'Your consultation has been confirmed and added to your health calendar.'
                   }
                 </p>
                 
                 <div className="mt-10 bg-slate-50 p-6 rounded-[32px] border border-slate-100 text-left">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Next Steps</p>
                    <ul className="space-y-2">
                       <li className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-tight">
                         <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                         Check your Calendar
                       </li>
                       {consultType === 'tele' ? (
                        <li className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-tight">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          Join via tele-link at {bookingTime}
                        </li>
                       ) : (
                        <li className="flex items-start gap-2 text-[10px] font-black text-slate-900 uppercase tracking-tight">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1" />
                          <span>Doctor will arrive at your doorstep at {bookingTime}</span>
                        </li>
                       )}
                    </ul>
                 </div>

                 <button 
                  onClick={() => {
                    setShowBookingSuccess(false);
                    setIsChatOpen(true);
                  }}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] mt-10 shadow-xl shadow-slate-900/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
                 >
                   Got it
                 </button>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Detail Overlay */}
        {selectedDoctor && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
               onClick={() => setSelectedDoctor(null)} 
             />
             <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-t-[48px] sm:rounded-[48px] p-8 pb-12 relative z-10 shadow-2xl overflow-hidden border-t border-white/20"
             >
                <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10 sm:hidden" />
                
                <AnimatePresence mode="wait">
                  {bookingStep === 'details' ? (
                    <motion.div 
                      key="details"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="relative group mb-6">
                        <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
                        <div className="relative w-28 h-28 rounded-[38px] bg-white border-4 border-white shadow-2xl overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDoctor.name}`} alt={selectedDoctor.name} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center text-white">
                          <Star size={16} fill="white" />
                        </div>
                      </div>

                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedDoctor.name}</h3>
                      <p className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mt-1">{selectedDoctor.specialty}</p>
                      
                      <div className="flex gap-2 mt-4">
                         <span className="text-[10px] bg-slate-50 text-slate-400 font-bold px-3 py-1 rounded-full border border-slate-100 uppercase tracking-tighter shrink-0 truncate max-w-[200px]">
                           {selectedDoctor.qualifications || 'Expert Practitioner'}
                         </span>
                         <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter">
                           Verified
                         </span>
                         <div className="flex gap-1 ml-1">
                            {selectedDoctor.types?.includes('tele') && (
                              <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100" title="Tele-Consultation Available">
                                <Smartphone size={10} />
                              </div>
                            )}
                            {selectedDoctor.types?.includes('home') && (
                              <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100" title="Home-Visit Available">
                                <MapPin size={10} />
                              </div>
                            )}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full my-10">
                         <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 text-left">
                           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Experience</p>
                           <p className="text-xl font-black text-slate-900 tracking-widest">{selectedDoctor.experience || selectedDoctor.exp} <span className="text-xs font-bold text-slate-400">Yrs</span></p>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 text-left">
                           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Fee</p>
                           <p className="text-xl font-black text-slate-900 tracking-tight">Rs. {selectedDoctor.ratePerSession || selectedDoctor.fee}</p>
                         </div>
                      </div>

                      <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50 w-full mb-8">
                        <p className="text-slate-600 text-sm leading-relaxed font-medium italic">
                          "{selectedDoctor.bio || 'Dedicated healthcare professional committed to providing exceptional care and personalized treatment plans.'}"
                        </p>
                      </div>

                      <div className="w-full flex flex-col gap-4">
                        <button 
                         onClick={() => {
                           setBookingStep('scheduling');
                         }}
                         className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                           {isLoading && <Loader2 className="animate-spin" size={20} />}
                           Schedule Appointment
                        </button>
                        <button 
                          onClick={() => setSelectedDoctor(null)} 
                          className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                          Keep Browsing
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="scheduling"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between mb-8">
                         <button onClick={() => setBookingStep('details')} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95 shadow-sm">
                           <ChevronLeft size={24} />
                         </button>
                         <div className="text-center">
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Consultation Schedule</h3>
                           <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{selectedDoctor.name}</p>
                         </div>
                         <div className="w-12" />
                      </div>

                      <div className="space-y-8 max-h-[60vh] overflow-y-auto px-1 scrollbar-hide">
                         {/* Option Tabs - Advanced Design */}
                          <div className="bg-slate-50 p-2 rounded-[24px] flex gap-2 border border-slate-100 shadow-inner">
                            {[
                              { id: 'scheduled', label: 'Book Slot', icon: Clock },
                              { id: 'asap', label: 'Express Visit', icon: Activity, onlyHome: true },
                              { id: 'queue', label: 'Waitlist', icon: Users }
                            ].filter(opt => !opt.onlyHome || consultType === 'home').map(opt => (
                              <button 
                                key={opt.id}
                                onClick={() => {
                                  setBookingOption(opt.id as any);
                                  if (opt.id === 'asap') {
                                    setBookingTime(consultType === 'tele' ? 'within 30 mins' : '10:00 AM');
                                  }
                                }}
                                className={clsx(
                                  "flex-1 py-4 flex flex-col items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] rounded-2xl transition-all",
                                  bookingOption === opt.id ? "bg-white shadow-xl text-blue-600 scale-[1.02]" : "text-slate-400 hover:bg-slate-100"
                                )}
                              >
                                <opt.icon size={16} className={bookingOption === opt.id ? "text-blue-500" : "text-slate-300"} />
                                {opt.label}
                                {opt.id === 'asap' && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] px-1.5 py-0.5 rounded-full">2X Price</span>}
                              </button>
                            ))}
                         </div>

                        {(bookingOption === 'scheduled' || bookingOption === 'asap') && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                          >
                             {bookingOption === 'asap' && (
                               <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-3">
                                 <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0">
                                   <Activity size={20} />
                                 </div>
                                 <div className="text-left">
                                   <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-tight">Express Priority Protocol</p>
                                   <p className="text-[10px] font-bold text-slate-900 leading-tight">Priority slot allocation at double fee (Rs. {(selectedDoctor.ratePerSession || selectedDoctor.fee || selectedDoctor.consultationFee) * 2})</p>
                                 </div>
                               </div>
                             )}

                             {consultType === 'home' && (
                               <div className="space-y-4">
                                 <div className="flex items-center justify-between px-2">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Visit Address</p>
                                   <button 
                                     onClick={() => setUserLocation(user?.address || '')} 
                                     className="text-[9px] font-black text-blue-600 uppercase tracking-tighter"
                                   >
                                     Use Saved
                                   </button>
                                 </div>
                                 <div className="relative group">
                                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                   <input 
                                     required
                                     type="text" 
                                     value={userLocation}
                                     onChange={(e) => setUserLocation(e.target.value)}
                                     placeholder="Enter your street address, building, floor..."
                                     className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 text-xs font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                                   />
                                 </div>
                                 <p className="text-[8px] text-slate-400 px-4 leading-tight uppercase font-bold italic">Required for clinical team dispatch</p>
                               </div>
                             )}

                             {bookingOption === 'asap' ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="space-y-6"
                                >
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Express Arrival Window</p>
                                    <div className="grid grid-cols-1 gap-3">
                                      {[
                                        { id: 'within 30 mins', label: 'Within 30 Mins', sub: 'High Priority Dispatch' },
                                        { id: 'under 45 mins', label: 'Under 45 Mins', sub: 'Priority Queue' },
                                        { id: 'under 60 mins', label: 'Under 60 Mins', sub: 'Standard Express' }
                                      ].map(opt => (
                                        <button
                                          key={opt.id}
                                          onClick={() => {
                                            setBookingTime(opt.id);
                                            setBookingDate(dayjs().format('YYYY-MM-DD'));
                                          }}
                                          className={clsx(
                                            "flex items-center justify-between p-6 rounded-[32px] border-2 transition-all text-left group",
                                            bookingTime === opt.id 
                                              ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
                                              : "bg-white border-slate-50 text-slate-400 hover:border-slate-100 shadow-sm"
                                          )}
                                        >
                                          <div>
                                            <p className="text-sm font-black uppercase tracking-tight">{opt.label}</p>
                                            <p className={clsx("text-[9px] font-bold opacity-60 uppercase tracking-widest", bookingTime === opt.id ? "text-white" : "text-slate-400")}>{opt.sub}</p>
                                          </div>
                                          <div className={clsx("w-6 h-6 rounded-full border flex items-center justify-center transition-all", bookingTime === opt.id ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-50 border-slate-100 text-transparent")}>
                                            <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-4">
                                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                        {consultType === 'tele' ? <Smartphone size={24} /> : <HomeIcon size={24} />}
                                     </div>
                                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-relaxed">
                                       {consultType === 'tele' 
                                         ? 'A notification will be sent to your device 5 minutes before the doctor starts the call.'
                                         : 'A doctor will be dispatched to your location immediately after confirmation.'}
                                     </p>
                                  </div>
                                </motion.div>
                             ) : (
                               <>
                                 <div>
                                    <div className="flex items-center justify-between mb-4 px-2">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choose Date</p>
                                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{dayjs(bookingDate).format('MMMM YYYY')}</p>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-6 pt-1 px-1 scrollbar-hide">
                                      {[0, 1, 2, 3, 4, 5, 6, 7].map(offset => {
                                        const date = dayjs().add(offset, 'day');
                                        const isSelected = bookingDate === date.format('YYYY-MM-DD');
                                        const isToday = date.isSame(dayjs(), 'day');
                                        return (
                                          <button
                                            key={offset}
                                            onClick={() => setBookingDate(date.format('YYYY-MM-DD'))}
                                            className={clsx(
                                              "flex flex-col items-center justify-center min-w-[72px] h-24 rounded-[32px] border-2 transition-all shrink-0 relative",
                                              isSelected 
                                                ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/30 scale-105 z-10" 
                                                : "bg-white border-slate-50 text-slate-400 hover:border-slate-100"
                                            )}
                                          >
                                            <span className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-70">{isToday ? 'Today' : date.format('ddd')}</span>
                                            <span className="text-2xl font-black tracking-tighter">{date.format('D')}</span>
                                            {isSelected && <motion.div layoutId="dtDot" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rounded-full" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                 </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-4 px-2">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultation Length</p>
                                    </div>
                                    <div className="flex gap-3 px-2 mb-8">
                                      {[
                                        { id: 'quick', label: 'Quick Consult', sub: '< 15 mins', icon: Activity, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                                        { id: 'regular', label: 'Full Session', sub: '> 15 mins', icon: Clock, color: 'text-blue-500 bg-blue-50 border-blue-100' }
                                      ].map(dur => (
                                        <button
                                          key={dur.id}
                                          onClick={() => setBookingDuration(dur.id as any)}
                                          className={clsx(
                                            "flex-1 p-5 rounded-[28px] border-2 transition-all text-left relative overflow-hidden group",
                                            bookingDuration === dur.id 
                                              ? "border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02]" 
                                              : "border-slate-50 bg-white text-slate-400 hover:border-slate-200"
                                          )}
                                        >
                                          <dur.icon size={20} className={clsx("mb-3 transition-transform group-hover:scale-110", bookingDuration === dur.id ? "text-white" : dur.color.split(' ')[0])} />
                                          <p className="text-[11px] font-black uppercase tracking-tight">{dur.label}</p>
                                          <p className={clsx("text-[9px] font-bold opacity-60", bookingDuration === dur.id ? "text-white" : "text-slate-400")}>{dur.sub}</p>
                                          {bookingDuration === dur.id && (
                                            <motion.div layoutId="durCheck" className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full" />
                                          )}
                                        </button>
                                      ))}
                                    </div>

                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Select Preferred Slot</p>
                                    <div className="space-y-6">
                                      {['Morning', 'Afternoon', 'Evening'].map((period) => {
                                        const allSlots = selectedDoctor.workingHours 
                                          ? generateTimeSlots(selectedDoctor.workingHours) 
                                          : ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
                                        
                                        const periodSlots = allSlots.filter(t => {
                                          const hour = parseInt(t.split(':')[0]);
                                          const isPM = t.includes('PM');
                                          if (period === 'Morning') return t.includes('AM') || hour === 12 && !t.includes('PM');
                                          if (period === 'Afternoon') return t.includes('PM') && (hour < 5 || hour === 12);
                                          if (period === 'Evening') return t.includes('PM') && hour >= 5 && hour !== 12;
                                          return true;
                                        });

                                        if (periodSlots.length === 0) return null;

                                        return (
                                          <div key={period} className="px-2">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">{period}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                              {periodSlots.map(time => (
                                                <button
                                                  key={time}
                                                  onClick={() => setBookingTime(time)}
                                                  className={clsx(
                                                    "py-4 rounded-2xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter",
                                                    bookingTime === time 
                                                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                                      : "bg-white border-slate-50 text-slate-400 hover:border-slate-100 shadow-sm"
                                                  )}
                                                >
                                                  {time}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                             )}
                          </motion.div>
                        )}

                        {bookingOption === 'queue' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-20 text-center bg-slate-50/50 rounded-[64px] border-2 border-dashed border-slate-200"
                          >
                             <div className="w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl bg-indigo-100 text-indigo-600 shadow-indigo-100">
                                <Users size={40} />
                             </div>
                             <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                               Queue System
                             </h4>
                             <p className="text-xs text-slate-400 mt-4 font-bold px-12 leading-relaxed opacity-70">
                               We will place you in the current active queue for the next available slot.
                             </p>
                             <div className="mt-8 flex items-center justify-center gap-2">
                                <span className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse bg-indigo-50 text-indigo-600">Live Status Tracking</span>
                             </div>
                          </motion.div>
                        )}
                      </div>

                      <div className="mt-12 group">
                        <button 
                         onClick={handleConfirmBooking}
                         className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black shadow-2xl shadow-slate-900/30 group-hover:shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs hover:bg-slate-800"
                        >
                           {isLoading && <Loader2 className="animate-spin" size={20} />}
                           Pay Rs. {bookingOption === 'asap' 
                             ? (selectedDoctor.ratePerSession || selectedDoctor.fee || selectedDoctor.consultationFee) * 2 
                             : (selectedDoctor.ratePerSession || selectedDoctor.fee || selectedDoctor.consultationFee)
                           } & Confirm
                        </button>
                        <p className="text-[9px] text-slate-300 font-bold text-center mt-6 uppercase tracking-[0.2em]">Secure Checkout • Instant Confirmation</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </motion.div>
          </div>
        )}

        {/* Home Screen View (Selection Modes) */}
        <AnimatePresence mode="wait">
          {consultMode === 'type' && (
            <motion.div 
              key="mode-type"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col gap-8 py-10"
            >
              <div className="text-center">
                 <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-white rounded-[38px] flex items-center justify-center text-blue-600 mx-auto mb-10 shadow-2xl shadow-blue-200 border border-slate-100"
                 >
                    <Stethoscope size={48} strokeWidth={1.5} />
                 </motion.div>
                 <h1 className="text-5xl font-black text-slate-900 leading-[0.9] tracking-tighter">Choose<br/><span className="text-blue-600">Your Care.</span></h1>
                 <p className="text-slate-400 text-sm font-bold mt-6 tracking-widest uppercase opacity-60">Consultation Formats</p>
              </div>

              <div className="grid grid-cols-1 gap-5 mt-4">
                <button 
                  onClick={() => { 
                    setConsultType('tele'); 
                    setConsultMode('selection');
                    setBookingOption('scheduled'); 
                  }}
                  className="group relative bg-white p-10 rounded-[50px] border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-200/40 transition-all active:scale-[0.97] overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <div className="w-20 h-20 bg-blue-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-600/30 group-hover:rotate-6 transition-transform">
                        <Smartphone size={36} />
                     </div>
                     <ChevronRight size={24} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tele Doctor</h3>
                    <p className="text-sm text-slate-400 font-bold mt-2 opacity-80">Instant video/voice call with specialists from anywhere in Nepal.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { 
                    setConsultType('home'); 
                    setConsultMode('selection');
                    setBookingOption('scheduled');
                  }}
                  className="group relative bg-white p-10 rounded-[50px] border-2 border-slate-100 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-200/40 transition-all active:scale-[0.97] overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <div className="w-20 h-20 bg-emerald-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-emerald-600/30 group-hover:rotate-6 transition-transform">
                        <HomeIcon size={36} />
                     </div>
                     <ChevronRight size={24} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Home Visit</h3>
                    <p className="text-sm text-slate-400 font-bold mt-2 opacity-80">Book a visit from a clinical expert to your residence for physical care.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {consultMode === 'selection' && (
            <motion.div 
              key="mode-selection"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex flex-col gap-10 py-12 items-center text-center"
            >
              <div className="flex items-center justify-between w-full">
                <button onClick={() => setConsultMode('type')} className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><ChevronLeft size={24} /></button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-28 h-28 bg-white rounded-[44px] flex items-center justify-center text-emerald-600 shadow-2xl border border-slate-50">
                   <Search size={48} strokeWidth={1} />
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tighter">How shall we<br/>match you?</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-6 opacity-60">Consult Mode: {consultType === 'tele' ? 'Virtual' : 'Home'}</p>
              </div>
              
              <div className="w-full grid grid-cols-1 gap-4 px-2">
                 <button 
                  onClick={() => setConsultMode('symptom')}
                  className="bg-white p-8 rounded-[40px] flex items-center gap-6 border-2 border-slate-50 hover:border-blue-500 transition-all group shadow-sm active:scale-95"
                 >
                    <div className="w-16 h-16 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 shrink-0">
                       <FlaskConical size={28} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Mapping</p>
                      <p className="text-xs text-slate-400 font-bold opacity-80">Match doctors via symptoms</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-blue-500" />
                 </button>
                 
                 <button 
                  onClick={() => setConsultMode('specialty-grid')}
                  className="bg-white p-8 rounded-[40px] flex items-center gap-6 border-2 border-slate-50 hover:border-emerald-500 transition-all group shadow-sm active:scale-95"
                 >
                    <div className="w-16 h-16 bg-emerald-50 rounded-[22px] flex items-center justify-center text-emerald-600 shrink-0">
                       <Users size={28} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">Browse All</p>
                      <p className="text-xs text-slate-400 font-bold opacity-80">Manual category selection</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-emerald-500" />
                 </button>
              </div>
            </motion.div>
          )}

          {consultMode === 'specialty-grid' && (
             <motion.div 
               key="mode-specialty-grid"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="flex flex-col gap-6"
             >
               <div className="flex items-center justify-between">
                  <button onClick={() => setConsultMode('selection')} className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm"><ChevronLeft size={24} /></button>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Specialties</h2>
                  <div className="w-12" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                        setActiveSpecialty('All');
                        setConsultMode('doctor-list');
                    }}
                    className="col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[32px] shadow-xl flex items-center justify-center gap-4 hover:scale-[1.02] transition-all active:scale-95 group mb-2"
                  >
                    <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Not sure?</p>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Browse All Practitioners</h4>
                    </div>
                    <ChevronRight size={20} className="text-white/40 ml-auto" />
                  </motion.button>

                  {specialtyCategories.map((cat, idx) => (
                    <motion.button
                      key={cat.id + idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setActiveSpecialty(cat.id);
                        setConsultMode('doctor-list');
                      }}
                      className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-xl hover:border-blue-500 transition-all active:scale-95 group"
                    >
                      <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <cat.icon size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">
                        {cat.label}
                      </span>
                    </motion.button>
                  ))}
               </div>
             </motion.div>
          )}

          {consultMode === 'symptom' && (
            <motion.div 
              key="mode-symptom"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-8 pb-12"
            >
              <div className="flex items-center justify-between">
                 <button onClick={() => setConsultMode('selection')} className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100"><ChevronLeft size={24} /></button>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Symptoms</h2>
                 <div className="w-12" />
              </div>

              <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-2xl shadow-blue-100 relative overflow-hidden">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">What's bothering you today?</p>
                 
                 {/* Quick selection symptoms */}
                 <div className="flex flex-wrap gap-2 mb-6 justify-center">
                   {commonSymptoms.map(s => (
                     <button
                       key={s}
                       onClick={() => {
                         const symptoms = symptomText.split(',').map(item => item.trim()).filter(Boolean);
                         if (symptoms.includes(s)) {
                           setSymptomText(symptoms.filter(item => item !== s).join(', '));
                         } else {
                           setSymptomText(prev => prev ? `${prev}, ${s}` : s);
                         }
                       }}
                       className={clsx(
                         "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                         symptomText.toLowerCase().includes(s.toLowerCase()) 
                           ? "bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-600" 
                           : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-blue-50 hover:text-blue-600"
                       )}
                     >
                       {s}
                     </button>
                   ))}
                 </div>

                 <textarea 
                  rows={6}
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="e.g. Sharp chest pain radiating to back..."
                  className="w-full bg-slate-50 border-none rounded-[32px] p-8 text-lg font-black focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-300 leading-tight resize-none"
                 />
              </div>

              <button 
                disabled={!symptomText.trim()}
                onClick={handleSymptomAnalysis}
                className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black shadow-2xl active:scale-95 disabled:opacity-50 transition-all uppercase tracking-[0.2em] text-xs"
              >
                Scan for Specialists
              </button>
            </motion.div>
          )}

          {consultMode === 'doctor-list' && (
            <motion.div 
              key="mode-doctor-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8 pb-20"
            >
              <div className="sticky top-0 bg-slate-50/80 backdrop-blur-xl z-20 -mx-5 px-5 py-4 flex flex-col gap-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <button onClick={() => setConsultMode('specialty-grid')} className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100"><ChevronLeft size={22} /></button>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Practitioners</h1>
                  <div className="w-11" />
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or expertise..."
                    className="w-full bg-white border border-slate-100 rounded-[20px] py-4 pl-12 pr-4 text-xs font-bold shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['All', ...new Set(specialtyCategories.map(c => c.id))].map(spec => (
                    <button
                      key={spec}
                      onClick={() => setActiveSpecialty(spec)}
                      className={clsx(
                        "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border-2 shrink-0",
                        activeSpecialty === spec 
                          ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                          : "bg-white text-slate-400 border-slate-50"
                      )}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {isFetching ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-6">
                    <div className="relative">
                       <Loader2 className="animate-spin text-blue-600" size={56} strokeWidth={1} />
                       <HeartPulse className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600/30" size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Polling Database...</p>
                  </div>
                ) : filteredDoctors.length > 0 ? (
                  filteredDoctors.map(doc => (
                    <motion.div 
                      layout
                      key={doc.id} 
                      className="bg-white p-6 rounded-[44px] border border-slate-100 shadow-sm flex flex-col gap-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all active:scale-[0.98] cursor-pointer group"
                      onClick={() => { if (doc.available) setSelectedDoctor(doc); }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                           <div className="w-22 h-22 rounded-[32px] bg-slate-50 overflow-hidden border-4 border-white shadow-xl group-hover:rotate-3 transition-transform">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt={doc.name} className="w-full h-full object-cover" />
                           </div>
                           <div className={clsx(
                             "absolute -bottom-1 -right-1 w-7 h-7 border-4 border-white rounded-full transition-colors shrink-0",
                             (doc.available !== false) ? "bg-emerald-500" : "bg-slate-300"
                           )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-black text-slate-900 uppercase tracking-tighter truncate text-lg">{doc.name}</h4>
                            <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2.5 py-1 rounded-xl">
                              <Star size={12} fill="currentColor" />
                              <span className="text-[10px] font-black">{doc.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{doc.specialty}</p>
                          <div className="flex items-center gap-3 mt-4">
                             <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-tighter bg-slate-50 px-2.5 py-1 rounded-lg">
                               <Clock size={12} /> {doc.experience || doc.exp} Yrs Experience
                             </div>
                             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">NMC: {doc.nmcId || '627X'}</div>
                          </div>
                        </div>
                      </div>

                      {doc.available !== false && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <DoctorMiniCalendar 
                            workingHours={doc.workingHours}
                            onSelectSlot={(date, time) => {
                              setSelectedDoctor(doc);
                              setBookingDate(date);
                              setBookingTime(time);
                              setBookingStep('scheduling');
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Consultation</p>
                          <p className="font-black text-slate-900 text-2xl tracking-tighter">Rs. {doc.ratePerSession || doc.fee}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.available !== false) setSelectedDoctor(doc);
                          }}
                          className={clsx(
                            "px-10 py-5 rounded-[22px] text-[10px] uppercase font-black tracking-widest transition-all",
                            (doc.available !== false) 
                              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95" 
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          )}
                        >
                          {(doc.available !== false) ? 'Book Session' : 'Currently Busy'}
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-24 bg-white rounded-[60px] border-4 border-dashed border-slate-50 flex flex-col items-center text-center px-12">
                     <div className="w-24 h-24 bg-slate-50 rounded-[38px] flex items-center justify-center text-slate-200 mb-8">
                       <Search size={48} strokeWidth={1} />
                     </div>
                     <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Zero Clinical Logs</h4>
                     <p className="text-xs text-slate-400 font-bold mt-4 leading-relaxed px-4 opacity-60 uppercase tracking-widest underline decoration-wavy decoration-slate-100 italic">Please wait while we verify practitioners in your local region.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

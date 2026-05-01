import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  DollarSign, 
  Star, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Settings,
  Activity,
  ArrowUpRight,
  UserCheck,
  Power,
  X,
  Save,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

import ProviderOnboarding from './ProviderOnboarding';

export default function ProviderDashboard() {
  const { user, updateProfile } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  const [stats, setStats] = useState({
    totalConsults: 0,
    earnings: 0,
    rating: 4.8
  });

  useEffect(() => {
    if (user?.providerInfo) {
      setFormData({
        ...user.providerInfo,
        name: user.name
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'appointments'), where('doctorId', '==', user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(docs);
      setStats(prev => ({
        ...prev,
        totalConsults: docs.length,
        earnings: docs.reduce((acc: number, curr: any) => acc + (curr.fee || 0), 0)
      }));
    });

    return () => unsub();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { name, ...providerInfo } = formData;
      await updateDoc(doc(db, 'users', user.id), {
        name,
        providerInfo: {
          ...user.providerInfo,
          ...providerInfo
        },
        updatedAt: serverTimestamp()
      });
      // Update local state too if needed, useAuthStore updateProfile might be called automatically if listening to user doc
      // In this setup, we usually call updateProfile from the store which handles state + firebase if configured
      await updateProfile({
        name,
        providerInfo: {
          ...user.providerInfo,
          ...providerInfo
        }
      });
      setIsSettingsOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailability = async () => {
    if (!user?.providerInfo) return;
    await updateProfile({
      providerInfo: {
        ...user.providerInfo,
        available: !user.providerInfo.available
      }
    });
  };

  if (!user) return null;

  if (!user.onboardingComplete) {
    return <ProviderOnboarding onComplete={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsSettingsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profile Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Specialty</label>
                    <input 
                      type="text" 
                      value={formData.specialty || ''}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Experience (Yrs)</label>
                    <input 
                      type="number" 
                      value={formData.experience || 0}
                      onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Consultation Fee (NPR)</label>
                  <input 
                    type="number" 
                    value={formData.consultationFee || 0}
                    onChange={(e) => setFormData({...formData, consultationFee: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Professional Bio</label>
                  <textarea 
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Working Hours</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 09:00 AM - 05:00 PM"
                    value={formData.workingHours || ''}
                    onChange={(e) => setFormData({...formData, workingHours: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all outline-none"
                  />
                </div>
              </div>

              <div className="p-8 border-t border-slate-50">
                <button 
                  disabled={isSaving}
                  onClick={handleSaveSettings}
                  className="w-full bg-slate-900 text-white p-5 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                  {isSaving ? <Activity className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="bg-white p-6 pt-12 pb-10 rounded-b-[40px] shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
              {user.role === 'lab' ? 'Laboratory' : 'Provider'} Portal
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                Logged in as <span className="text-blue-600">{user.role === 'lab' ? 'Lab Center' : user.providerType}</span>
              </span>
              {user.providerInfo?.isVerified ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  <CheckCircle2 size={12} /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  <AlertCircle size={12} /> Pending Verification
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={toggleAvailability}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
              user.providerInfo?.available 
                ? 'bg-blue-600 text-white shadow-blue-200 ring-4 ring-blue-50' 
                : 'bg-slate-200 text-slate-400 shadow-slate-100'
            }`}
          >
            <Power size={24} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-3xl p-4 flex flex-col gap-1 border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultations</span>
            <span className="text-xl font-black text-slate-900">{stats.totalConsults}</span>
          </div>
          <div className="bg-blue-50 rounded-3xl p-4 flex flex-col gap-1 border border-blue-100">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Earnings</span>
            <span className="text-xl font-black text-blue-600">Rs.{stats.earnings}</span>
          </div>
          <div className="bg-emerald-50 rounded-3xl p-4 flex flex-col gap-1 border border-emerald-100">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Rating</span>
            <span className="text-xl font-black text-emerald-600 tracking-tight flex items-center gap-1">
              {stats.rating} <Star size={14} fill="currentColor" />
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Verification Alert */}
        {!user.providerInfo?.isVerified && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-amber-50 border-2 border-amber-100 rounded-[32px] p-6 flex gap-4"
          >
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Account verification required</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
                Your profile is currently hidden from patients. Complete your professional profile to start receiving bookings.
              </p>
              <button className="mt-3 text-[10px] font-black text-amber-600 uppercase tracking-widest underline decoration-wavy decoration-amber-200">
                Submit Documents
              </button>
            </div>
          </motion.div>
        )}

        {/* Action List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-blue-600" /> Active Requests
            </h2>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {appointments.length} Total
            </span>
          </div>

          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((apt: any) => (
                <div key={apt.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Users size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{apt.userName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{apt.type === 'tele' ? 'Video Consult' : 'Home Visit'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">Rs.{apt.fee}</span>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">{apt.status}</p>
                  </div>
                </div>
              ))
            ) : (
                <div className="bg-white rounded-[32px] p-12 flex flex-col items-center justify-center text-center opacity-40">
                  <Activity size={48} className="text-slate-300 mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active requests found</p>
                </div>
            )}
          </div>
        </div>

        {/* Professional Tools */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2">
            Professional Tools
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-white rounded-[32px] p-6 text-left shadow-sm border border-slate-100 group">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Schedule</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Manage slots</p>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white rounded-[32px] p-6 text-left shadow-sm border border-slate-100 group"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                <Settings size={20} />
              </div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Settings</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Profile details</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

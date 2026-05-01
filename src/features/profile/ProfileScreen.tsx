import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Calendar, Heart, ShieldCheck, ArrowLeft, Mail, Phone, ChevronRight, MapPin, ClipboardList, Settings, Save, X, Camera, HeartPulse, Stethoscope, Briefcase, GraduationCap, Trash2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import dayjs from '../../utils/date';
import { signInWithGoogle, signInWithEmail } from '../../lib/firebase';

export default function ProfileScreen() {
  const { user, isEditingProfile, setEditingProfile, updateProfile, logout, deleteAccount, isLoading } = useAuthStore();
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState(user || {});
  const navigate = useNavigate();

  const handleAccountDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err: any) {
      if (err.message === 'REAUTH_REQUIRED') {
        alert('For security reasons, you must re-authenticate before deleting your account. Please log out and log back in, then try again.');
        logout();
      } else {
        console.error('Delete failed:', err);
        alert('Failed to delete account. Please try again later.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  const location = useLocation();
  const wasRedirected = location.state?.from;

  useEffect(() => {
    if (user && wasRedirected) {
      navigate(wasRedirected.pathname + wasRedirected.search, { replace: true });
    }
  }, [user, wasRedirected, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = () => {
    // Navigate to home to use the main RoleSelection which has full email support
    navigate('/');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(editForm);
      setEditingProfile(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile. Check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminTrigger = () => {
    const newCount = adminTapCount + 1;
    if (newCount >= 5) {
      setShowAdminLogin(true);
      setAdminTapCount(0);
    } else {
      setAdminTapCount(newCount);
      // Reset count after 2 seconds of inactivity
      setTimeout(() => setAdminTapCount(0), 2000);
    }
  };

  const sections = [
    { label: 'Full Name', value: user?.name, icon: UserIcon },
    ...(user?.role === 'provider' ? [
      { label: 'Specialty', value: user?.providerInfo?.specialty || 'Not set', icon: HeartPulse },
      { label: 'Experience', value: user?.providerInfo?.experience ? `${user.providerInfo.experience} years` : 'Not set', icon: UserIcon },
    ] : []),
    { label: 'Birthday', value: user?.dob ? dayjs(user.dob).format('MMM DD, YYYY') : 'Not set', icon: Calendar },
    { label: 'Sex', value: user?.sex || 'Not set', icon: UserIcon, className: 'capitalize' },
    { label: 'Blood group', value: user?.bloodGroup || 'Not set', icon: Heart },
    { label: 'Address', value: user?.address || 'Not set', icon: MapPin },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-6 flex items-center gap-4 border-b border-slate-100">
        <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Personal Information</h1>
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence>
          {wasRedirected && !user && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500 text-white p-4 rounded-[24px] shadow-lg shadow-rose-500/20 flex items-center gap-4 mb-4"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Access Restricted</p>
                <p className="text-xs font-bold">Please sign in first to access health services.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!user ? (
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
              <UserIcon size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Welcome Back</h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">Please sign in to sync your medical history and access admin records.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 grayscale invert" alt="google" />
                )}
                GOOGLE SIGN IN
              </button>
              <button 
                onClick={handleEmailLogin}
                className="w-full bg-white text-slate-900 border border-slate-200 font-black py-5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Mail size={20} className="text-blue-600" />
                EMAIL / PASSWORD
              </button>
            </div>
          </div>
        ) : (
          <>
          {/* Profile Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-white shadow-sm overflow-hidden shrink-0">
                 <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Avatar" />
              </div>
              {isEditingProfile && (
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {user?.role === 'provider' ? (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                    Professional {user.providerType}
                  </span>
                ) : (
                  <span 
                    onClick={handleAdminTrigger}
                    className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest leading-none cursor-pointer active:scale-95 transition-transform"
                  >
                    Verified Patient
                  </span>
                )}
                {user?.providerInfo?.isVerified && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                    Certified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Controls */}
        {!isEditingProfile && user && (
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setEditForm(user || {});
                setEditingProfile(true);
              }}
              className="flex-1 bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
            >
              <Settings size={18} />
              EDIT HEALTH PROFILE
            </button>
            <button 
              onClick={logout}
              className="px-6 bg-white text-rose-500 border border-slate-100 font-bold py-5 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Medical Records Link (MOVED UP) */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Quick Access</p>
          <Link 
            to="/records"
            className="w-full bg-white rounded-[32px] p-5 border border-slate-100 flex items-center justify-between group shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <ClipboardList size={18} />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Health History</label>
                <p className="text-sm font-bold text-slate-700">Medical Vault</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {isEditingProfile ? (
            <motion.div 
              key="edit-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-slate-900 uppercase">Edit Profile</h3>
                <button onClick={() => setEditingProfile(false)} className="p-2 text-slate-400"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Birthday</label>
                  <input type="date" value={editForm.dob || ''} onChange={(e) => setEditForm({...editForm, dob: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Blood Group</label>
                    <select value={editForm.bloodGroup || ''} onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5 appearance-none">
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sex</label>
                    <select value={editForm.sex || ''} onChange={(e) => setEditForm({...editForm, sex: e.target.value as any})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5 appearance-none">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Address</label>
                  <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
                  <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" />
                </div>

                {user?.role === 'provider' && (
                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Details</p>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Specialty / Department</label>
                      <input 
                        type="text" 
                        value={editForm.providerInfo?.specialty || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          providerInfo: { ...editForm.providerInfo, specialty: e.target.value } 
                        })} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Qualificiation (Degree)</label>
                      <input 
                        type="text" 
                        value={editForm.providerInfo?.qualification || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          providerInfo: { ...editForm.providerInfo, qualification: e.target.value } 
                        })} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Experience (Years)</label>
                        <input 
                          type="number" 
                          value={editForm.providerInfo?.experience || 0} 
                          onChange={(e) => setEditForm({
                            ...editForm, 
                            providerInfo: { ...editForm.providerInfo, experience: parseInt(e.target.value) || 0 } 
                          })} 
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Service Fee</label>
                        <input 
                          type="number" 
                          value={editForm.providerInfo?.consultationFee || 0} 
                          onChange={(e) => setEditForm({
                            ...editForm, 
                            providerInfo: { ...editForm.providerInfo, consultationFee: parseFloat(e.target.value) || 0 } 
                          })} 
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Professional Bio</label>
                      <textarea 
                        value={editForm.providerInfo?.bio || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          providerInfo: { ...editForm.providerInfo, bio: e.target.value } 
                        })} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5 h-32 resize-none" 
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4">Emergency Contact</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Contact Name</label>
                      <input 
                        type="text" 
                        value={editForm.emergencyContact?.name || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          emergencyContact: {
                            name: e.target.value,
                            phone: editForm.emergencyContact?.phone || ''
                          }
                        })} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">Contact Phone</label>
                      <input 
                        type="text" 
                        value={editForm.emergencyContact?.phone || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          emergencyContact: {
                            name: editForm.emergencyContact?.name || '',
                            phone: e.target.value
                          }
                        })} 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold mt-1.5" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} />
                    UPDATE PROFILE
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="profile-details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Info Grid */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Profile Details</p>
                <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm divide-y divide-slate-50">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                          <sec.icon size={18} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{sec.label}</label>
                          <p className={`text-sm font-bold text-slate-700 ${sec.className || ''}`}>{sec.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Contact Information</p>
                <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm divide-y divide-slate-50">
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                      <Mail size={18} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Email</label>
                      <p className="text-sm font-bold text-slate-700">{user?.email}</p>
                    </div>
                    <ShieldCheck className="text-emerald-500" size={18} />
                  </div>
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                      <Phone size={18} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Phone Number</label>
                      <p className="text-sm font-bold text-slate-700">{user?.phone || 'Not linked'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Emergency Contact</p>
                <div className="bg-rose-50 rounded-[32px] p-6 border border-rose-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                     <Heart size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900">{user?.emergencyContact?.name || 'Not set'}</h4>
                    <p className="text-xs text-rose-600 font-medium">
                      {user?.emergencyContact?.phone || 'Add this in profile settings for safety'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Donation Support */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Support Our Project</p>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all" />
                   <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                           <Heart size={24} className="fill-white" />
                        </div>
                        <div>
                          <h4 className="font-black uppercase tracking-tight">Donate Now</h4>
                          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Support our voluntary work</p>
                        </div>
                     </div>
                     <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">eSewa ID / Phone</p>
                        <p className="text-xl font-black tracking-tighter">9861313408</p>
                     </div>
                     <button 
                       onClick={() => window.open('https://esewa.com.np', '_blank')}
                       className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                     >
                       Donate via eSewa
                     </button>
                   </div>
                </div>
              </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Account</p>
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm divide-y divide-slate-50">
                <button className="w-full p-5 flex items-center justify-between group" onClick={logout}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      <X size={18} />
                    </div>
                    <div className="text-left">
                      <label className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">Security</label>
                      <p className="text-sm font-bold text-rose-600">Sign Out Account</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-600 transition-colors" />
                </button>
                <button 
                  className="w-full p-5 flex items-center justify-between group" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                      <Trash2 size={18} />
                    </div>
                    <div className="text-left">
                      <label className="text-[10px] font-bold text-red-400 uppercase tracking-tight">Danger Zone</label>
                      <p className="text-sm font-bold text-red-600">Delete My Account</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter leading-none mb-4">
                Permanently <br/> Delete Account?
              </h3>
              <p className="text-sm text-slate-500 text-center font-medium leading-relaxed mb-8">
                This action is irreversible. All your medical history, prescriptions, and profile data will be permanently erased from our clinical records.
              </p>

              <div className="space-y-3">
                <button 
                  disabled={isDeleting}
                  onClick={handleAccountDelete}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-200 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      YES, DELETE FOREVER
                    </>
                  )}
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  NEVERMIND
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminLoginModal isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} />
      </div>
    </div>
  );
}

function AdminLoginModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { superLogin } = useAuthStore();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (superLogin(password)) {
      onClose();
      navigate('/admin');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl"
      >
        <h3 className="text-2xl font-black text-slate-900 mb-2">Internal Access</h3>
        <p className="text-xs text-slate-400 mb-6 font-medium">Please enter the security authorization key or sign in with an authorized Google account to enter management mode.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            autoFocus
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-center font-black tracking-[0.5em] focus:ring-2 focus:ring-slate-900/10 ${error ? 'animate-bounce text-rose-500' : ''}`}
            placeholder="••••••"
          />
          <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
            AUTHORIZE ACCESS
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-300 bg-white px-4">OR</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={async () => {
              await signInWithGoogle();
              onClose();
              navigate('/admin');
            }}
            className="w-full bg-white border border-slate-100 text-slate-600 font-bold py-4 rounded-2xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="google" />
            GOOGLE SIGN IN
          </button>
          
          <button 
            onClick={() => {
              onClose();
              navigate('/');
            }}
            className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl shadow-sm hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Mail size={18} className="text-blue-500" />
            EMAIL LOGIN
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-400 mt-6 font-bold uppercase tracking-tight">
          Note: Google Sign-in is required for database write permissions.
        </p>
      </motion.div>
    </div>
  );
}

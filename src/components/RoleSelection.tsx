import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Stethoscope, HeartPulse, Pill, FlaskConical, ChevronRight, CheckCircle2, LogIn, ArrowLeft, ShieldCheck, Check, Activity, Brain, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } from '../lib/firebase';

export default function RoleSelection() {
  const [step, setStep] = useState<'base' | 'provider_type' | 'auth'>('base');
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [selectedRole, setSelectedRole] = useState<'patient' | 'provider' | 'lab' | null>(null);
  const [selectedProviderType, setSelectedProviderType] = useState<'doctor' | 'nurse' | 'pharmacist' | 'lab' | 'physiotherapist' | 'psychologist' | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);

  const roles = [
    {
      id: 'patient',
      title: 'I am a Patient',
      desc: 'Access secure medical history, pharmacy, and expert consultations.',
      icon: User,
      color: 'bg-blue-600',
      tagline: '100% HIPAA Confidential'
    },
    {
      id: 'provider',
      title: 'Health Professional',
      desc: 'Offer consultations, manage practice, and handle digital prescriptions.',
      icon: Stethoscope,
      color: 'bg-slate-900',
      tagline: 'Verified Professionals Only'
    },
    {
      id: 'lab',
      title: 'Diagnostic Lab',
      desc: 'Process health checks, upload reports, and manage lab bookings.',
      icon: FlaskConical,
      color: 'bg-amber-500',
      tagline: 'Authorized Labs Only'
    }
  ];

  const providerTypes = [
    { id: 'doctor', title: 'Physician', icon: Stethoscope, color: 'bg-blue-600', desc: 'MBBS/MD Specialists' },
    { id: 'nurse', title: 'Nurse / Care', icon: HeartPulse, color: 'bg-rose-500', desc: 'Registered Caregivers' },
    { id: 'physiotherapist', title: 'Physiotherapist', icon: Activity, color: 'bg-indigo-500', desc: 'Rehab & Mobility' },
    { id: 'psychologist', title: 'Psychologist', icon: Brain, color: 'bg-purple-500', desc: 'Mental Wellness' },
    { id: 'pharmacist', title: 'Pharmacy', icon: Pill, color: 'bg-emerald-500', desc: 'Licensed Chemists' }
  ];

  const handleRoleSelect = (role: 'patient' | 'provider' | 'lab') => {
    setSelectedRole(role);
    setConsented(false);
    if (role === 'provider') {
      setStep('provider_type');
    } else if (role === 'lab') {
      setSelectedProviderType('lab');
      setStep('auth');
    } else {
      setStep('auth');
    }
  };

  const handleProviderTypeSelect = (type: 'doctor' | 'nurse' | 'pharmacist' | 'lab' | 'physiotherapist' | 'psychologist') => {
    setSelectedProviderType(type);
    setStep('auth');
  };

  const handleSignIn = async () => {
    if (!selectedRole || !consented) return;
    setIsLoggingIn(true);
    setError(null);

    // Basic Validation
    if (authMethod === 'email') {
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoggingIn(false);
        return;
      }
      if (emailMode !== 'reset' && formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoggingIn(false);
        return;
      }
    }

    try {
      if (authMethod === 'google') {
        await signInWithGoogle(selectedRole, selectedProviderType);
      } else {
        if (emailMode === 'login') {
          await signInWithEmail(formData.email, formData.password, selectedRole, selectedProviderType);
        } else if (emailMode === 'signup') {
          if (!formData.name) throw new Error('Full name is required');
          await signUpWithEmail(formData.email, formData.password, formData.name, selectedRole, selectedProviderType);
        } else if (emailMode === 'reset') {
          await sendPasswordReset(formData.email);
          alert('Check your email for the password reset link');
          setEmailMode('login');
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      
      let message = err.message || 'Authentication failed';
      
      // Map specific Firebase error codes to user-friendly messages
      switch (err.code) {
        case 'auth/operation-not-allowed':
          message = 'Email authentication is not enabled. Go to your Firebase Console > Auth > Sign-in method and enable "Email/Password".';
          break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          // These are often consolidated or mean the same thing to the end user
          if (emailMode === 'login') {
            message = 'Identification failed. This email may not be registered yet, or the password is incorrect. Use "Create Account" if you are new.';
          } else {
            message = 'Registration failed. This email might already be in use with a different login method, or the service is temporarily restricted.';
          }
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please log in instead or use a different email.';
          break;
        case 'auth/weak-password':
          message = 'The security of your password is too low. Please use at least 6 characters with symbols/numbers.';
          break;
        case 'auth/invalid-email':
          message = 'The email address format is invalid. Ensure there are no spaces or hidden characters.';
          break;
        case 'auth/popup-blocked':
          message = 'Login popup was blocked by your browser. Please allow popups for this site.';
          break;
        case 'auth/unauthorized-domain':
          message = 'This domain is not authorized in your Firebase console. Add this URL to "Authorized Domains" in Auth settings.';
          break;
      }
      
      setError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-y-auto">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
      
      <div className="max-w-md mx-auto w-full px-6 py-12 relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-100 mb-6">
            <HeartPulse size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
            Digital Health <span className="text-blue-600 italic">Evolved</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Nepal's Most Secure Medical Network
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'base' ? (
            <motion.div 
              key="base"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-6 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Select your profile to start encryption</p>
              </div>

              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id as any)}
                  className="w-full bg-white rounded-[32px] p-8 text-left border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all active:scale-[0.98] group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                      <div className={`w-12 h-12 ${role.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                        <role.icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{role.title}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-snug">{role.desc}</p>
                      </div>
                      <span className="inline-block text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-[0.1em]">
                        {role.tagline}
                      </span>
                    </div>
                    <ChevronRight size={24} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </motion.div>
          ) : step === 'provider_type' ? (
            <motion.div 
              key="provider"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setStep('base')}
                className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Back to Selection
              </button>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none italic underline decoration-blue-200 decoration-8 underline-offset-4">Professional</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Specify your medical department</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {providerTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleProviderTypeSelect(type.id as any)}
                    className="flex items-center gap-4 bg-slate-50 hover:bg-white p-5 rounded-[28px] border border-transparent hover:border-slate-200 hover:shadow-xl transition-all text-left active:scale-[0.99] group"
                  >
                    <div className={`w-14 h-14 ${type.color} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:rotate-6 transition-transform`}>
                      <type.icon size={28} />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">{type.title}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type.desc}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4"
            >
              <div className="bg-slate-900 rounded-[48px] p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20" />
                
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/10 rounded-[32px] mx-auto flex items-center justify-center text-white mb-8 border border-white/20">
                    {selectedRole === 'patient' ? <User size={48} /> : <Stethoscope size={48} />}
                  </div>
                  
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-4">
                    Secure <br/> <span className="text-blue-400">Authentication</span>
                  </h2>
                  
                  <div className="inline-block bg-white/10 px-3 py-1.5 rounded-full mb-8">
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">
                      Role: {selectedRole === 'patient' ? 'Verified Patient' : (selectedRole === 'lab' ? 'Lab Portal' : `${selectedProviderType} Portal`)}
                    </p>
                  </div>

                  {/* Auth Tabs */}
                  <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
                    <button 
                      onClick={() => setAuthMethod('google')}
                      className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${authMethod === 'google' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Google
                    </button>
                    <button 
                      onClick={() => setAuthMethod('email')}
                      className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${authMethod === 'email' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Email
                    </button>
                  </div>

                  {authMethod === 'email' && (
                    <div className="space-y-4 mb-6">
                      {emailMode === 'signup' && (
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                          <input 
                            type="text" 
                            placeholder="FULL NAME"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-white/5 border-2 border-white/10 focus:border-blue-500 rounded-2xl p-4 pl-12 text-xs font-bold text-white uppercase tracking-widest outline-none transition-all"
                          />
                        </div>
                      )}
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input 
                          type="email" 
                          placeholder="EMAIL ADDRESS"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-white/5 border-2 border-white/10 focus:border-blue-500 rounded-2xl p-4 pl-12 text-xs font-bold text-white uppercase tracking-widest outline-none transition-all"
                        />
                      </div>
                      {emailMode !== 'reset' && (
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                          <input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="PASSWORD"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-white/5 border-2 border-white/10 focus:border-blue-500 rounded-2xl p-4 pl-12 pr-12 text-xs font-bold text-white tracking-widest outline-none transition-all"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center px-1">
                        {emailMode === 'login' ? (
                          <>
                            <button onClick={() => setEmailMode('signup')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-all">Create Account</button>
                            <button onClick={() => setEmailMode('reset')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-all">Forgot?</button>
                          </>
                        ) : emailMode === 'signup' ? (
                          <button onClick={() => setEmailMode('login')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-all">Existing Account? Login</button>
                        ) : (
                          <button onClick={() => setEmailMode('login')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-all">Back to Login</button>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setConsented(!consented)}
                    className={`w-full mb-8 p-5 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${
                      consented ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      consented ? 'bg-blue-500 text-white' : 'bg-white/20 border border-white/20'
                    }`}>
                      {consented && <Check size={14} strokeWidth={4} />}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1 italic">Confidentiality Protocol</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed">
                        I agree to handle all medical data with strict privacy as per Nepal's Personal Data Protection standards.
                      </p>
                    </div>
                  </button>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-[9px] font-black uppercase tracking-widest p-4 rounded-2xl mb-6">
                      {error}
                      {emailMode === 'login' && (error.includes('not found') || error.includes('incorrect') || error.includes('Invalid details')) && (
                        <button 
                          onClick={() => { setEmailMode('signup'); setError(null); }}
                          className="block mt-2 text-white bg-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          Switch to Sign Up
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    disabled={!consented || isLoggingIn}
                    onClick={handleSignIn}
                    className="w-full bg-white text-slate-900 p-6 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                  >
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        {authMethod === 'google' ? (
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="google" />
                        ) : (
                          <LogIn size={24} className="text-blue-600" />
                        )}
                        {emailMode === 'signup' ? 'Create Secure Account' : emailMode === 'reset' ? 'Reset Password' : 'Complete Secure Sign in'}
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setStep(selectedRole === 'provider' ? 'provider_type' : 'base')}
                    className="mt-10 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
                  >
                    ← Go Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <ShieldCheck size={20} className="text-emerald-500" />
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">End-to-End Encrypted</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Your data never leaves the secure cloud.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

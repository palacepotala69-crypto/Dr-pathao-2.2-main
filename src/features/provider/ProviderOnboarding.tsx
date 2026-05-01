import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface OnboardingProps {
  onComplete: () => void;
}

export default function ProviderOnboarding({ onComplete }: OnboardingProps) {
  const { user, updateProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    specialty: '',
    qualification: '',
    experience: 0,
    consultationFee: 0,
    bio: '',
    licenseNumber: '',
    clinicName: '',
    education: '',
    companyRegNumber: '',
    technicianName: '',
    technicianLicense: '',
    affiliatedHospitals: [] as string[],
    services: [] as string[]
  });

  React.useEffect(() => {
    if (user?.providerType && !formData.specialty) {
      setFormData(prev => ({
        ...prev,
        specialty: user.providerType === 'lab' ? 'Laboratory' : (user.providerType === 'pharmacist' ? 'Pharmacy' : prev.specialty)
      }));
    }
  }, [user?.providerType]);

  const specialtiesForDoctors = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Pediatrician', 
    'Orthopedic Surgeon', 'Neurologist', 'Gynecologist', 'Psychiatrist',
    'Ophthalmologist', 'ENT Specialist'
  ];

  const getLabel = (field: string) => {
    switch (field) {
      case 'specialty':
        if (user?.providerType === 'lab') return 'Primary Lab Focus';
        if (user?.providerType === 'pharmacist') return 'Pharmacy Category';
        if (user?.providerType === 'doctor') return 'Medical Specialty';
        return 'Specialization';
      case 'qualification':
        if (user?.providerType === 'lab') return 'Lab Accreditation';
        return 'Highest Degree / Qualification';
      case 'clinicName':
        if (user?.providerType === 'lab') return 'Laboratory Center Name';
        return 'Clinic / Workplace Name';
      case 'companyRegNumber':
        return 'Company Registration Number (VAT/PAN)';
      default:
        return field;
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        const providerInfo: any = {
          ...formData,
          isVerified: false,
          available: true
        };

        // specialized mapping
        if (user?.providerType === 'lab') {
          providerInfo.technicianDetails = {
            name: formData.technicianName,
            licenseId: formData.technicianLicense
          };
        }

        await updateProfile({
          providerInfo,
          onboardingComplete: true
        });
        onComplete();
      } catch (err) {
        console.error('Onboarding failed:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col overflow-y-auto">
      <div className="max-w-md mx-auto w-full px-6 py-12 flex flex-col min-h-screen">
        <div className="mb-10">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-blue-600' : 'bg-slate-100'}`} 
              />
            ))}
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
            Professional <br/> <span className="text-blue-600">Verification</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Step {step} of 3: {step === 1 ? 'Credentials' : step === 2 ? 'Practice Details' : 'Finalize'}
          </p>
        </div>

        <div className="flex-1">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                {user?.providerType === 'doctor' ? (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Specialization</label>
                    <select 
                      value={formData.specialty}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                      className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold transition-all appearance-none"
                    >
                      <option value="">Select Specialty</option>
                      {specialtiesForDoctors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{getLabel('specialty')}</label>
                    <div className="relative mt-1.5">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="e.g. Diagnostic, Pathological"
                        value={formData.specialty}
                        onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{getLabel('qualification')}</label>
                  <div className="relative mt-1.5">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. MBBS, MD, PhD"
                      value={formData.qualification}
                      onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                    />
                  </div>
                </div>

                {user?.providerType === 'doctor' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Education Background</label>
                    <div className="relative mt-1.5">
                      <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                      <textarea 
                        placeholder="Universities attended, Residency programs..."
                        value={formData.education}
                        onChange={(e) => setFormData({...formData, education: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold h-24 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Council License Number</label>
                  <div className="relative mt-1.5">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Official Identification Number"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                    />
                  </div>
                </div>

                {user?.providerType === 'lab' && (
                   <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Company Registration Number</label>
                    <div className="relative mt-1.5">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="VAT / PAN Number"
                        value={formData.companyRegNumber}
                        onChange={(e) => setFormData({...formData, companyRegNumber: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{getLabel('clinicName')}</label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Workplace Location"
                      value={formData.clinicName}
                      onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                    />
                  </div>
                </div>

                {user?.providerType === 'doctor' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Affiliated Hospitals</label>
                    <div className="relative mt-1.5">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Divide by commas (e.g. Bir Hospital, Om Hospital)"
                        value={formData.affiliatedHospitals.join(', ')}
                        onChange={(e) => setFormData({...formData, affiliatedHospitals: e.target.value.split(',').map(s => s.trim())})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 pl-12 text-sm font-bold transition-all"
                      />
                    </div>
                  </div>
                )}

                {user?.providerType === 'lab' && (
                  <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Lab Technician Credentials</p>
                    <input 
                      type="text" 
                      placeholder="Technician Full Name"
                      value={formData.technicianName}
                      onChange={(e) => setFormData({...formData, technicianName: e.target.value})}
                      className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold"
                    />
                    <input 
                      type="text" 
                      placeholder="Technician License ID"
                      value={formData.technicianLicense}
                      onChange={(e) => setFormData({...formData, technicianLicense: e.target.value})}
                      className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Years of Experience</label>
                  <input 
                    type="range" 
                    min="0" max="40"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-4"
                  />
                  <p className="text-center font-black text-blue-600 text-lg mt-2">{formData.experience} Years</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Bio</label>
                  <textarea 
                    placeholder="Describe your expertise and practice philosophy..."
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-sm font-bold mt-1.5 h-32 resize-none transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-[32px] border-2 border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                    {user?.providerType === 'lab' ? 'Collection / Service Fee (NPR)' : 'Consultation Fee (NPR)'}
                  </label>
                  <div className="relative mt-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-blue-600">Rs.</span>
                    <input 
                      type="number" 
                      value={formData.consultationFee}
                      onChange={(e) => setFormData({...formData, consultationFee: parseFloat(e.target.value) || 0})}
                      className="w-full bg-white border-2 border-transparent focus:border-blue-400 rounded-2xl p-6 pl-16 text-3xl font-black text-slate-900 transition-all placeholder:text-slate-200"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-4 text-center">Service fee for customers</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Verification Status</h3>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                    Once you complete the setup, our admin team will verify your documents within 24-48 hours. You will then have full access to DR.Pathao features.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-10 pt-10 border-t border-slate-50 flex gap-4">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-slate-100 text-slate-900 p-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
            >
              Back
            </button>
          )}
          <button 
            disabled={loading || (step === 1 && !formData.specialty)}
            onClick={handleNext}
            className="flex-[2] bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {step === 3 ? 'Complete Setup' : 'Continue'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

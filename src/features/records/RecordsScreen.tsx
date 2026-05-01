import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  ClipboardList, 
  ShieldCheck, 
  Download, 
  Trash2, 
  Calendar, 
  ChevronRight, 
  Camera, 
  X, 
  Loader2, 
  Upload,
  Pill,
  Activity,
  History,
  FlaskConical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { useAuthStore } from '../../store/useAuthStore';
import { useReminderStore } from '../../store/useReminderStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { Link } from 'react-router-dom';
import dayjs from '../../utils/date';

export default function RecordsScreen() {
  const { user } = useAuthStore();
  const { medicines, subscribe: subscribeReminders } = useReminderStore();
  const { events, subscribe: subscribeCalendar } = useCalendarStore();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redundant subscriptions removed as they are handled globally by FirebaseSync
  }, []);

  const upcomingScreenings = events
    .filter(e => e.category === 'screening' && dayjs(e.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const currentMedications = medicines.filter(m => !m.taken || m.frequency !== 'daily'); // Basic filter for "current"

  const [records, setRecords] = useState([
    { id: 1, title: 'Annual Lab Report', date: 'July 24, 2026', type: 'Lab Test', status: 'Verified', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { id: 2, title: 'General Physician Prescription', date: 'June 12, 2026', type: 'Prescription', status: 'Available', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 3, title: 'X-Ray Report (Chest)', date: 'May 05, 2026', type: 'Radiology', status: 'Pending', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ]);

  const processImage = async (file: File) => {
    setIsProcessing(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: "Extract information from this medical record. Provide a title, date, and category (e.g., Lab Test, Prescription, Radiology, Consultation).",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING, description: "Format: Month DD, YYYY" },
              type: { type: Type.STRING },
            },
            required: ["title", "date", "type"],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      
      const newRecord = {
        id: Date.now(),
        title: result.title || 'Untitled Report',
        date: result.date || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        type: result.type || 'Medical Record',
        status: 'Verified',
        color: 'bg-blue-50 text-blue-600 border-blue-100'
      };

      setRecords(prev => [newRecord, ...prev]);
      setIsScanning(false);
    } catch (error) {
      console.error('Error scanning record:', error);
      alert('Failed to process the record. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-8 relative min-h-screen">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="image/*"
      />

      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" 
            />
            <div className="relative z-10 w-full flex flex-col items-center">
               <div className="flex items-center justify-between w-full mb-12">
                 <button onClick={() => setIsScanning(false)} className="text-white p-2">
                   <X size={24} />
                 </button>
                 <span className="text-white font-bold text-sm tracking-widest uppercase">Smart Scanner</span>
                 <div className="w-10" />
               </div>

               <div className="w-full aspect-[3/4] border-2 border-blue-500/50 rounded-[40px] relative overflow-hidden bg-slate-800 shadow-2xl shadow-blue-500/20">
                  {isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-md z-30">
                       <Loader2 size={48} className="text-blue-500 animate-spin" />
                       <div className="text-center px-8">
                          <p className="text-white font-bold text-lg">Analyzing Report</p>
                          <p className="text-slate-400 text-xs mt-2">AI is extracting medical data and digitizing your records...</p>
                       </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                      <Camera size={64} className="opacity-20" />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/10 px-6 py-3 rounded-2xl flex items-center gap-2 text-white font-bold hover:bg-white/20 transition-all border border-white/10"
                      >
                        <Upload size={18} />
                        Choose Photo
                      </button>
                    </div>
                  )}
                  {/* Scanner Beam Animation */}
                  <motion.div 
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] z-20"
                  />
                  {/* Corner Accents */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
               </div>

               <div className="mt-12 text-center">
                  <p className="text-white font-bold mb-8">Align the document or upload a photo</p>
                  <button 
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
                  >
                    <div className="w-16 h-16 border-4 border-slate-900 rounded-full" />
                  </button>
               </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Records Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Records</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage and access your medical history securely.</p>
        </div>
        <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-100 shrink-0">
          <ShieldCheck size={24} />
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm grid grid-cols-3 divide-x divide-slate-50">
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Age</p>
          <p className="text-lg font-black text-slate-900">{user?.age || 'N/A'}</p>
        </div>
        <div className="text-center px-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Sex</p>
          <p className="text-lg font-black text-slate-900 capitalize">{user?.sex || 'N/A'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Blood</p>
          <p className="text-lg font-black text-rose-500 uppercase">{user?.bloodGroup || 'N/A'}</p>
        </div>
      </div>

      <Link 
        to="/labs"
        className="w-full bg-amber-500 text-white p-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
      >
        <FlaskConical size={20} />
        Go to Lab Diagnostics
      </Link>

      {/* Upcoming Screening Section */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Upcoming Screenings Card */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
             <div className="relative z-10">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 px-1">
                  <Calendar size={14} />
                  Upcoming Screenings
               </h3>
               
               <div className="space-y-4">
                  {upcomingScreenings.length > 0 ? (
                    upcomingScreenings.map((event) => (
                      <div key={event.id} className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-50 transition-all hover:border-slate-200">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Activity size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                             <span className="flex items-center gap-1"><Calendar size={10} /> {dayjs(event.date).format('MMM D, YYYY')}</span>
                             {event.time && <span className="flex items-center gap-1 font-mono">{event.time}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <History className="mx-auto text-slate-100 mb-2" size={32} />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No screenings scheduled</p>
                    </div>
                  )}
               </div>
             </div>
             <Activity className="absolute -bottom-4 -right-4 w-24 h-24 text-slate-500/5 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      {/* History List */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            Medical History
          </h3>
          <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 cursor-pointer">Filter By</button>
        </div>

        <div className="flex flex-col gap-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
               <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${record.color}`}>
                     <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{record.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-1">
                      <Calendar size={12} className="text-slate-300" /> {record.date}
                    </p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors group-hover:scale-110">
                    <ChevronRight size={18} />
                  </button>
               </div>

               <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.type}</span>
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <Download size={16} />
                    </button>
                    <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* Empty State / Call to Action */}
      <div className="bg-slate-900 rounded-[32px] p-6 text-white flex flex-col gap-4 items-center text-center mt-4">
         <div className="w-16 h-16 rounded-[24px] bg-white/10 flex items-center justify-center text-blue-400">
           <FileText size={32} />
         </div>
         <div>
           <h3 className="font-bold">Missing something?</h3>
           <p className="text-xs text-white/50 px-6 mt-1 italic">Scan physical reports and we'll digitize them with AI.</p>
         </div>
         <button 
           onClick={() => setIsScanning(true)}
           className="w-full bg-blue-600 py-3 rounded-2xl text-xs font-bold hover:bg-blue-500 transition-colors mt-2 ring-4 ring-blue-600/20 shadow-xl shadow-blue-900/50"
         >
           Scan New Record
         </button>
      </div>
    </div>
  );
}

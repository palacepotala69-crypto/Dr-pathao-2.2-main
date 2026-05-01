import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Bell, 
  Check, 
  Clock as ClockIcon, 
  Pill, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  Droplets,
  Heart,
  Stethoscope,
  FlaskConical,
  Search
} from 'lucide-react';
import { useReminderStore } from '../../store/useReminderStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import dayjs from '../../utils/date';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function RemindersScreen() {
  const { medicines, toggleMedicine, addMedicine, deleteMedicine, updateMedicine, isLoading, subscribe: subscribeMeds } = useReminderStore();
  const { events, globalEvents, dismissedEventIds, subscribe: subscribeEvents, addEvent, deleteEvent, updateEvent } = useCalendarStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'med' | 'event', data: any } | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [activeTab, setActiveTab] = useState<'overview' | 'meds' | 'appointments' | 'period'>('overview');
  
  const [entryType, setEntryType] = useState<'medication' | 'appointment' | 'reminder'>('medication');
  const [newMed, setNewMed] = useState({ 
    name: '', 
    dosage: '', 
    time: '08:00', 
    time2: '20:00',
    frequency: 'daily' as any,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
    customDates: [] as string[]
  });
  const [customDateInput, setCustomDateInput] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    // No redundant local subscriptions
    return () => {};
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.time) {
      alert('Please enter a name and time.');
      return;
    }
    
    try {
      if (editingItem) {
        if (editingItem.type === 'med') {
          await updateMedicine(editingItem.id, {
            title: newMed.name,
            dosage: newMed.dosage,
            time: newMed.time,
            time2: newMed.time2,
            frequency: newMed.frequency,
            daysOfWeek: newMed.daysOfWeek,
            customDates: newMed.customDates
          });
        } else {
          await updateEvent(editingItem.id, {
            title: newMed.name,
            time: newMed.time,
            category: entryType === 'appointment' ? 'appointment' : 'alert',
            description: newMed.dosage || ''
          });
        }
      } else {
        if (entryType === 'medication') {
          await addMedicine({
            title: newMed.name,
            dosage: newMed.dosage,
            time: newMed.time,
            time2: newMed.time2,
            frequency: newMed.frequency,
            daysOfWeek: newMed.daysOfWeek,
            customDates: newMed.customDates,
            type: 'medication'
          });
        } else {
          // Add to calendar events
          await addEvent({
            title: newMed.name,
            date: selectedDate.format('YYYY-MM-DD'),
            time: newMed.time,
            category: entryType === 'appointment' ? 'appointment' : 'alert',
            description: newMed.dosage || '',
            status: 'pending',
            type: 'personal'
          });
        }
      }
      
      setNewMed({ 
        name: '', 
        dosage: '', 
        time: '08:00', 
        time2: '20:00',
        frequency: 'daily', 
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        customDates: [] 
      });
      setEditingItem(null);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item: any, type: 'med' | 'event') => {
    const baseId = item.id.replace(/-[12]$/, '');
    setEditingItem({ id: baseId, type, data: item });
    if (type === 'med') {
      setEntryType('medication');
      setNewMed({
        name: item.title || item.name,
        dosage: item.dosage,
        time: item.time,
        time2: item.time2 || '20:00',
        frequency: item.frequency,
        daysOfWeek: item.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        customDates: item.customDates || []
      });
    } else {
      setEntryType(item.category === 'appointment' ? 'appointment' : 'reminder');
      setNewMed({
        name: item.title,
        dosage: item.description || '',
        time: item.time || '08:00',
        time2: '20:00',
        frequency: 'daily',
        customDates: []
      });
    }
    setIsAddModalOpen(true);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'med' | 'event' } | null>(null);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      if (type === 'med') {
        await deleteMedicine(id);
      } else {
        await deleteEvent(id);
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteConfirm(null);
    }
  };

  const addCustomDate = () => {
    if (!newMed.customDates.includes(customDateInput)) {
      setNewMed({ ...newMed, customDates: [...newMed.customDates, customDateInput] });
    }
  };

  const removeCustomDate = (dateStr: string) => {
    setNewMed({ ...newMed, customDates: newMed.customDates.filter(d => d !== dateStr) });
  };

  // Logic to generate small calendar strip
  const calendarDates = Array.from({ length: 14 }).map((_, i) => 
    dayjs().subtract(3, 'day').add(i, 'day')
  );

  const filteredGlobalEvents = globalEvents.filter(e => !dismissedEventIds.includes(e.id));

  const filteredMedicines = medicines.flatMap(m => {
    const isSelectedDay = (() => {
      const dayOfWeek = selectedDate.day();
      if (m.frequency === 'custom') return m.customDates?.includes(selectedDate.format('YYYY-MM-DD'));
      if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
        const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
        return days.includes(dayOfWeek);
      }
      return false;
    })();

    if (!isSelectedDay) return [];

    const dateStr = selectedDate.format('YYYY-MM-DD');

    if (m.frequency === 'twice_daily') {
      return [
        { 
          ...m, 
          id: `${m.id}-1`, 
          displayTime: m.time, 
          slot: 1, 
          taken: !!m.takenLogs?.[`${dateStr}_1`] 
        },
        { 
          ...m, 
          id: `${m.id}-2`, 
          displayTime: m.time2 || '20:00', 
          slot: 2, 
          taken: !!m.takenLogs?.[`${dateStr}_2`] 
        }
      ];
    }

    return [{ 
      ...m, 
      displayTime: m.time, 
      taken: !!m.takenLogs?.[dateStr]
    }];
  });

  const filteredEvents = [...events, ...filteredGlobalEvents].filter(e => {
    return dayjs(e.date).isSame(selectedDate, 'day');
  });

  const takenCount = filteredMedicines.filter(m => m.taken).length;
  const totalCount = filteredMedicines.length;

  return (
    <div className="bg-slate-50 min-h-screen pb-32 pt-8">
      <AnimatePresence>
        {!user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Bell size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Sync Your Schedule</h2>
              <p className="text-slate-400 font-medium text-xs leading-relaxed mb-10 px-4">
                Sign in to track your medications, period cycle, and clinical appointments across all your devices.
              </p>
              <button 
                onClick={() => navigate('/profile', { state: { from: location } })}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                Sign In Now
              </button>
              <Link 
                to="/"
                className="inline-block mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                Go Back Home
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal Calendar Master */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Schedule</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Health Synchronizer</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2",
                isCalendarOpen ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-400 border-slate-100 shadow-sm"
              )}
            >
              <CalendarIcon size={24} />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
            >
              <Plus size={28} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isCalendarOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden bg-white rounded-[32px] border border-slate-100 p-4 shadow-2xl"
            >
              <Calendar 
                onChange={(val) => {
                  if (val instanceof Date) {
                    setSelectedDate(dayjs(val));
                    setIsCalendarOpen(false);
                  }
                }}
                value={selectedDate.toDate()}
                className="border-none w-full"
                tileClassName={({ date }) => {
                  const dStr = dayjs(date).format('YYYY-MM-DD');
                  const dOfWeek = dayjs(date).day();
                  const hasSth = [...events, ...filteredGlobalEvents].some(e => e.date === dStr) || 
                                medicines.some(m => {
                                  if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
                                    const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                                    return days.includes(dOfWeek);
                                  }
                                  if (m.frequency === 'custom') return m.customDates?.includes(dStr);
                                  return false;
                                });
                  return hasSth ? 'has-event' : '';
                }}
              />
              <style>{`
                .react-calendar { width: 100% !important; border: none !important; font-family: inherit !important; }
                .has-event::after { content: ''; display: block; width: 3px; height: 3px; background: #2563eb; border-radius: 50%; margin: 2px auto 0; }
                .react-calendar__tile--active { background: #0f172a !important; border-radius: 12px !important; }
                .react-calendar__navigation button { font-weight: 800; text-transform: uppercase; font-size: 10px; }
              `}</style>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {calendarDates.map((date) => {
            const isSelected = selectedDate.isSame(date, 'day');
            const isToday = dayjs().isSame(date, 'day');
            return (
              <button
                key={date.format('YYYY-MM-DD')}
                onClick={() => setSelectedDate(date)}
                className={clsx(
                  "flex-shrink-0 w-16 h-24 rounded-[32px] flex flex-col items-center justify-center transition-all border",
                  isSelected 
                    ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/10" 
                    : "bg-white border-slate-100"
                )}
              >
                <span className={clsx(
                  "text-[10px] font-black uppercase mb-2",
                  isSelected ? (isToday ? "text-rose-500" : "text-slate-400") : (isToday ? "text-rose-600 font-black" : "text-slate-300")
                )}>
                  {date.format('ddd')}
                </span>
                <span className={clsx(
                  "text-lg font-black",
                  isSelected ? "text-white" : "text-slate-800"
                )}>
                  {date.format('D')}
                </span>
                
                <div className="flex gap-0.5 mt-2">
                  {isToday && !isSelected && <div className="w-1 h-1 bg-rose-500 rounded-full" />}
                  {[...events, ...filteredGlobalEvents].some(e => dayjs(e.date).isSame(date, 'day')) && (
                    <div className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-blue-400" : "bg-blue-600")} />
                  )}
                  {medicines.some(m => {
                    const dStr = date.format('YYYY-MM-DD');
                    const dOfWeek = date.day();
                    if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
                      const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                      return days.includes(dOfWeek);
                    }
                    if (m.frequency === 'custom') return m.customDates?.includes(dStr);
                    return false;
                  }) && (
                    <div className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-amber-400" : "bg-amber-500")} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Tabs */}
      <div className="px-6 mb-8">
        <div className="flex gap-2 bg-white p-1.5 rounded-[22px] border border-slate-200 shadow-sm overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('overview')}
            className={clsx(
              "flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all",
              activeTab === 'overview' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "text-slate-400"
            )}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('meds')}
            className={clsx(
              "flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all",
              activeTab === 'meds' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-slate-400"
            )}
          >
            Medicine
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={clsx(
              "flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all",
              activeTab === 'appointments' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400"
            )}
          >
            Visits
          </button>
          {user?.sex === 'female' && (
            <button 
              onClick={() => setActiveTab('period')}
              className={clsx(
                "flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all",
                activeTab === 'period' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400"
              )}
            >
              Cycle
            </button>
          )}
        </div>
      </div>

      <div className="px-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Master Timeline</h3>
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{dayjs(selectedDate).format('MMM DD, YYYY')}</p>
            </div>

            {([...filteredMedicines.map(m => ({ ...m, itemType: 'med' })), ...filteredEvents.map(e => ({ ...e, itemType: 'event' }))] as any[])
              .sort((a, b) => (a.displayTime || a.time || '00:00').localeCompare(b.displayTime || b.time || '00:00'))
              .map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="relative pl-10 border-l-2 border-slate-100 pb-8 last:pb-0"
                >
                   <button 
                     onClick={() => {
                        const baseId = item.id.replace(/-[12]$/, '');
                        item.itemType === 'med' && toggleMedicine(baseId, selectedDate.format('YYYY-MM-DD'), item.slot);
                     }}
                     className={clsx(
                      "absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all active:scale-125 z-10",
                      item.itemType === 'med' ? (item.taken ? 'bg-emerald-500 scale-110 shadow-emerald-200' : 'bg-rose-500') : 'bg-blue-500'
                    )} />
                   
                   <div className="flex items-center gap-4 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm group">
                      <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        item.itemType === 'med' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                      )}>
                        {item.itemType === 'med' ? <Pill size={20} /> : item.category === 'lab_test' ? <FlaskConical size={20} /> : <Stethoscope size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                              {item.displayTime || item.time} • {item.itemType === 'med' ? 'Medication' : item.category?.replace('_', ' ')}
                            </span>
                         </div>
                         <h4 className="text-sm font-bold text-slate-900 truncate uppercase tracking-tight">{item.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(item, item.itemType === 'med' ? 'med' : 'event')}
                          className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: item.id, type: item.itemType === 'med' ? 'med' : 'event' })}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                   </div>
                </motion.div>
              ))}

              {filteredMedicines.length === 0 && filteredEvents.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100">
                  <CalendarIcon size={40} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="font-bold text-slate-900">Digital Silence</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Nothing scheduled for this timeline.</p>
                </div>
              )}
          </div>
        )}

        {activeTab === 'meds' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Planned</h3>
               <p className="text-[10px] font-black text-rose-500 uppercase">{takenCount}/{totalCount} Taken</p>
            </div>

            {isLoading ? (
               <div className="py-20 flex justify-center items-center"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : filteredMedicines.length > 0 ? (
              filteredMedicines.map((med) => (
                <div 
                  key={med.id}
                  className={clsx(
                    "p-5 rounded-[32px] border transition-all flex items-center gap-4 group",
                    med.taken 
                      ? "bg-slate-50 border-slate-100 opacity-60" 
                      : "bg-white border-slate-100 shadow-sm"
                  )}
                >
                  <div className={clsx(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                    med.taken ? "bg-slate-200 text-slate-400" : "bg-rose-50 text-rose-500 shadow-inner"
                  )}>
                    <Pill size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={clsx("font-bold text-slate-900 truncate", med.taken && "line-through opacity-50")}>{med.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">{med.dosage} • {med.displayTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!med.taken && (
                      <button 
                        onClick={() => handleEdit(med, 'med')}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const baseId = med.id.replace(/-[12]$/, '');
                        toggleMedicine(baseId, selectedDate.format('YYYY-MM-DD'), med.slot);
                      }}
                      className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90",
                        med.taken ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-100 text-slate-400"
                      )}
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ id: med.id, type: 'med' })}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100">
                <Bell size={40} className="mx-auto text-slate-200 mb-4" />
                <h3 className="font-bold text-slate-900">All Caught Up</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">No medication planned for this date.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Appointments</h3>
               <p className="text-[10px] font-black text-blue-500 uppercase">{filteredEvents.filter(e => e.category === 'appointment' || e.category === 'lab_test').length} Pending</p>
            </div>
            
            {filteredEvents.filter(e => e.category === 'appointment' || e.category === 'lab_test').length > 0 ? (
              filteredEvents.filter(e => e.category === 'appointment' || e.category === 'lab_test').map(event => (
                <div key={event.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:bg-slate-50 transition-colors">
                   <div className={clsx(
                     "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                     event.category === 'lab_test' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                   )}>
                     {event.category === 'lab_test' ? <FlaskConical size={24} /> : <Stethoscope size={24} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{event.title}</h4>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{event.time} • {event.category.replace('_', ' ')}</p>
                     {event.description && (
                       <p className="text-[10px] text-slate-400 mt-2 italic truncate">"{event.description}"</p>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     <button onClick={() => handleEdit(event, 'event')} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                       <ChevronRight size={18} />
                     </button>
                     <button onClick={() => setDeleteConfirm({ id: event.id, type: 'event' })} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                       <Trash2 size={18} />
                     </button>
                   </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100">
                <Stethoscope size={40} className="mx-auto text-slate-200 mb-4" />
                <h3 className="font-bold text-slate-900">No Visits Today</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Your upcoming appointments will show here.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'period' && (
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 text-center relative overflow-hidden">
             <div className="relative z-10">
               <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl">
                 <Droplets size={38} />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Cycle Tracking</h3>
               <p className="text-xs text-slate-400 mt-2 font-medium mb-8">Logging cycle insights for overall wellness.</p>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-slate-400">Current Phase</p>
                   <p className="text-sm font-bold text-indigo-600 mt-1 uppercase">Follicular</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-slate-400">Next Cycle</p>
                   <p className="text-sm font-bold text-rose-500 mt-1 uppercase">In 12 Days</p>
                 </div>
               </div>
               <button className="w-full bg-slate-900 text-white font-black py-5 rounded-[22px] mt-8 text-xs uppercase tracking-widest active:scale-95 transition-all">Record Note</button>
             </div>
             <Heart className="absolute -bottom-10 -right-10 w-40 h-40 text-indigo-50" />
           </div>
        )}
      </div>

      {/* Simplified Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-white w-full max-w-lg rounded-t-[44px] shadow-2xl p-10"
            >
               <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                     {editingItem ? 'Refine Entry' : 'Quick Entry'}
                   </h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 underline decoration-wavy decoration-slate-100 italic">
                     {editingItem ? 'Updating your schedule' : 'Syncing to Master Calendar'}
                   </p>
                 </div>
                 <button 
                   onClick={() => {
                     setIsAddModalOpen(false);
                     setEditingItem(null);
                     setNewMed({ name: '', dosage: '', time: '08:00', time2: '20:00', frequency: 'daily', customDates: [] });
                   }} 
                   className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                 >
                   <X size={20} />
                 </button>
               </div>

               <div className="flex gap-2 mb-8 p-1 bg-slate-100 rounded-3xl">
                 {[
                   { id: 'medication', label: 'Medicine', icon: Pill, color: 'text-rose-500', bg: 'bg-rose-50' },
                   { id: 'appointment', label: 'Visit', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50' },
                   { id: 'reminder', label: 'Care', icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                 ].map(t => (
                   <button
                     key={t.id}
                     type="button"
                     onClick={() => setEntryType(t.id as any)}
                     className={clsx(
                       "flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all",
                       entryType === t.id ? `bg-white shadow-xl ${t.color}` : "text-slate-400 opacity-60"
                     )}
                   >
                     <t.icon size={20} />
                     <span className="text-[9px] font-black uppercase tracking-widest leading-none">{t.label}</span>
                   </button>
                 ))}
               </div>

                <form onSubmit={handleAdd} className="space-y-6">
                 {entryType === 'medication' && (
                  <div className="mb-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-3 px-1 tracking-[0.2em]">Frequency Protocol</label>
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { id: 'daily', label: '1x Day', icon: ClockIcon, desc: 'Once daily' },
                          { id: 'twice_daily', label: '2x Day', icon: Pill, desc: 'Morning & Night' },
                          { id: 'custom', label: 'Custom', icon: CalendarIcon, desc: 'Select dates' },
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setNewMed({...newMed, frequency: f.id as any})}
                            className={clsx(
                              "flex flex-col items-center gap-2 p-4 rounded-[28px] border-2 transition-all",
                              newMed.frequency === f.id 
                                ? "bg-rose-500 border-rose-500 shadow-xl shadow-rose-500/20 text-white" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            <f.icon size={20} />
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest">{f.label}</span>
                              <span className={clsx("text-[7px] font-bold uppercase tracking-widest mt-0.5", newMed.frequency === f.id ? "text-rose-100" : "text-slate-300")}>{f.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <AnimatePresence>
                        {(newMed.frequency === 'daily' || newMed.frequency === 'twice_daily') && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                          >
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 px-1">Selected Routine Days</label>
                             <div className="flex justify-between gap-1">
                               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                                 const isSelected = newMed.daysOfWeek.includes(i);
                                 return (
                                   <button
                                     key={i}
                                     type="button"
                                     onClick={() => {
                                       const days = newMed.daysOfWeek.includes(i)
                                         ? newMed.daysOfWeek.filter(d => d !== i)
                                         : [...newMed.daysOfWeek, i];
                                       setNewMed({...newMed, daysOfWeek: days});
                                     }}
                                     className={clsx(
                                       "w-10 h-12 rounded-[18px] text-[10px] font-black transition-all border-2",
                                       isSelected 
                                        ? "bg-slate-900 border-slate-900 text-white scale-110 z-10 shadow-lg" 
                                        : "bg-white border-slate-50 text-slate-300"
                                     )}
                                   >
                                     {day}
                                   </button>
                                 );
                               })}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {newMed.frequency === 'custom' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden mt-6"
                          >
                            <div className="flex gap-2">
                              <input 
                                type="date"
                                className="flex-1 bg-slate-50 border border-slate-100 shadow-inner rounded-xl p-3 text-sm font-bold text-slate-900"
                                value={customDateInput}
                                onChange={(e) => setCustomDateInput(e.target.value)}
                              />
                              <button 
                                type="button"
                                onClick={addCustomDate}
                                className="bg-slate-900 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {newMed.customDates.map(date => (
                                 <div key={date} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-rose-100">
                                   {date}
                                   <button type="button" onClick={() => removeCustomDate(date)}><X size={10} /></button>
                                 </div>
                               ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                 )}

                 <div>
                    <label className={clsx(
                      "text-[10px] font-black uppercase tracking-widest mb-2 block px-1",
                      entryType === 'medication' ? 'text-rose-400' : entryType === 'appointment' ? 'text-blue-400' : 'text-emerald-400'
                    )}>
                      {entryType === 'medication' ? 'Medication Name' : entryType === 'appointment' ? 'Appointment Type' : 'Reminder Label'}
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder={entryType === 'medication' ? "e.g. Paracetamol" : "e.g. Dental Checkup"}
                      className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 text-slate-900 shadow-inner"
                      value={newMed.name}
                      onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                    />
                 </div>

                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1"> {entryType === 'medication' && (newMed.frequency === 'twice_daily') ? 'Morning Time' : 'Preferred Time'} </label>
                      <input 
                        required
                        type="time" 
                        className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 text-slate-900 shadow-inner"
                        value={newMed.time}
                        onChange={(e) => setNewMed({...newMed, time: e.target.value})}
                      />
                     </div>
                     
                     {entryType === 'medication' && (newMed.frequency === 'twice_daily') ? (
                       <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Evening Time</label>
                         <input 
                           required
                           type="time" 
                           className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 text-slate-900 shadow-inner"
                           value={newMed.time2}
                           onChange={(e) => setNewMed({...newMed, time2: e.target.value})}
                         />
                       </div>
                     ) : (
                       <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">
                          Date
                        </label>
                        <input 
                          disabled={editingItem?.type === 'med'}
                          type="date" 
                          className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 text-slate-900 shadow-inner opacity-60"
                          value={selectedDate.format('YYYY-MM-DD')}
                          readOnly
                        />
                       </div>
                     )}
                   </div>

                   <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">
                      {entryType === 'medication' ? 'Dose Amount (e.g. 500mg)' : 'Additional Info'}
                    </label>
                    <input 
                      required={entryType === 'medication'}
                      type="text" 
                      placeholder={entryType === 'medication' ? "e.g. 1 Tablet" : "Floor 3, Room 4"}
                      className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 text-slate-900 shadow-inner"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                    />
                   </div>
                 </div>

                 <button className={clsx(
                   "w-full text-white font-black py-5 rounded-[22px] shadow-2xl active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]",
                   entryType === 'medication' ? 'bg-rose-500 shadow-rose-500/20' : entryType === 'appointment' ? 'bg-blue-600 shadow-blue-600/20' : 'bg-emerald-500 shadow-emerald-500/20'
                 )}>
                   Deploy To Schedule
                 </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
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
              <h3 className="text-xl font-black text-slate-900 mb-2 font-sans uppercase tracking-tight">Delete Entry?</h3>
              <p className="text-xs text-slate-400 font-medium mb-8 font-sans">Are you sure you want to permanently remove this {deleteConfirm.type === 'med' ? 'medication' : 'event'}? This cannot be undone.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="py-4 bg-rose-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all font-sans"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

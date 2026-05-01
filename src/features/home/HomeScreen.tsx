import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, HeartPulse, FlaskConical, ChevronRight, Bell, Calendar as CalendarIcon, Pill, Megaphone, Clock as ClockIcon, AlertCircle, Trash2, Siren } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useReminderStore } from '../../store/useReminderStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { clsx } from 'clsx';
import dayjs from '../../utils/date';
import Calendar from 'react-calendar';
import Clock from 'react-clock';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

export default function HomeScreen() {
  const { medicines, toggleMedicine, deleteMedicine, subscribe: subscribeMeds } = useReminderStore();
  const { events, globalEvents, dismissedEventIds, deleteEvent, subscribe: subscribeEvents } = useCalendarStore();
  const { user } = useAuthStore();

  const [currentTime, setCurrentTime] = useState(new Date());

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'med' | 'event' } | null>(null);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      if (type === 'med') {
        // ID sanitization now handled in store, but we can pass baseId just in case or full suffixed ID
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

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(clockTimer);
    };
  }, []);

  const filteredGlobalEvents = globalEvents.filter(e => !dismissedEventIds.includes(e.id));

  // Get next upcoming event
  const upcomingEvents = events
    .filter(e => dayjs(e.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const nextEvent = upcomingEvents[0];
  
  const quickActions = [
    { id: 'consult', title: 'Consult Doctor', icon: Stethoscope, color: 'bg-blue-50 text-blue-600', path: '/consult' },
    { id: 'nursing', title: 'Nursing Services', icon: HeartPulse, color: 'bg-rose-50 text-rose-600', path: '/nursing' },
    { id: 'lab', title: 'Book Lab Test', icon: FlaskConical, color: 'bg-amber-50 text-amber-600', path: '/labs' },
  ];

  const healthTips = [
    { id: 1, title: 'Hydration', desc: 'Drink 8+ glasses of water daily.', icon: '💧', color: 'bg-blue-500', accent: 'text-blue-100' },
    { id: 2, title: 'Stretch', desc: '5 mins morning stretch.', icon: '🧘', color: 'bg-emerald-500', accent: 'text-emerald-100' },
    { id: 3, title: 'Balanced', desc: 'Eat more leafy greens daily.', icon: '🥗', color: 'bg-orange-500', accent: 'text-orange-100' },
    { id: 4, title: 'Sleep', desc: 'Consistent 8 hrs of rest.', icon: '😴', color: 'bg-indigo-500', accent: 'text-indigo-100' },
  ];

  const getTimeStatus = (timeStr: string, dateStr: string, isTaken: boolean) => {
    if (isTaken) return { label: 'Completed', color: 'text-emerald-500 bg-emerald-50' };
    
    const now = dayjs();
    const target = dayjs(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm');
    
    if (now.isAfter(target)) {
      return { label: 'Missed', color: 'text-rose-500 bg-rose-50' };
    }
    
    const diffMins = target.diff(now, 'minute');
    if (diffMins < 0) return { label: 'Missed', color: 'text-rose-500 bg-rose-50' };
    if (diffMins < 60) return { label: `In ${diffMins}m`, color: 'text-amber-500 bg-amber-50' };
    if (diffMins < 1440) {
      const diffHours = Math.floor(diffMins / 60);
      return { label: `In ${diffHours}h`, color: 'text-blue-500 bg-blue-50' };
    }
    return { label: 'Upcoming', color: 'text-slate-400 bg-slate-50' };
  };

  const upcomingReminders = medicines
    .flatMap(m => {
      const isSelectedDay = (() => {
        const dayOfWeek = dayjs().day();
        if (m.frequency === 'custom') return m.customDates?.includes(dayjs().format('YYYY-MM-DD'));
        if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
          const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
          return days.includes(dayOfWeek);
        }
        return false;
      })();

      if (!isSelectedDay) return [];

      const dateStr = dayjs().format('YYYY-MM-DD');

      if (m.frequency === 'twice_daily') {
        const t1 = !!m.takenLogs?.[`${dateStr}_1`];
        const t2 = !!m.takenLogs?.[`${dateStr}_2`];
        return [
          { ...m, id: `${m.id}-1`, displayTime: m.time, slot: 1, taken: t1, status: getTimeStatus(m.time, dateStr, t1) },
          { ...m, id: `${m.id}-2`, displayTime: m.time2 || '20:00', slot: 2, taken: t2, status: getTimeStatus(m.time2 || '20:00', dateStr, t2) }
        ];
      }
      const t = !!m.takenLogs?.[dateStr];
      return [{ ...m, displayTime: m.time, taken: t, status: getTimeStatus(m.time, dateStr, t) }];
    })
    .sort((a, b) => {
      const da = dayjs(`${dayjs().format('YYYY-MM-DD')} ${a.displayTime}`, 'YYYY-MM-DD HH:mm');
      const db = dayjs(`${dayjs().format('YYYY-MM-DD')} ${b.displayTime}`, 'YYYY-MM-DD HH:mm');
      return da.diff(db);
    })
    .slice(0, 3);

  const [selectedDay, setSelectedDay] = useState<string | null>(dayjs().format('YYYY-MM-DD'));

  const getDayDetails = (dateStr: string) => {
    const dateObj = dayjs(dateStr);
    const dayMeds = medicines.flatMap(m => {
      const isSelectedDay = (() => {
        const dayOfWeek = dateObj.day();
        if (m.frequency === 'custom') return m.customDates?.includes(dateStr);
        if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
          const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
          return days.includes(dayOfWeek);
        }
        return false;
      })();

      if (!isSelectedDay) return [];

      if (m.frequency === 'twice_daily') {
        return [
          { ...m, id: `${m.id}-1`, displayTime: m.time, slot: 1, taken: !!m.takenLogs?.[`${dateStr}_1`] },
          { ...m, id: `${m.id}-2`, displayTime: m.time2 || '20:00', slot: 2, taken: !!m.takenLogs?.[`${dateStr}_2`] }
        ];
      }
      return [{ ...m, displayTime: m.time, taken: !!m.takenLogs?.[dateStr] }];
    });

    const dayEvents = events.filter(e => dayjs(e.date).isSame(dateObj, 'day'));
    const dayGlobalEvents = filteredGlobalEvents.filter(e => dayjs(e.date).isSame(dateObj, 'day'));
    
    return { meds: dayMeds, events: [...dayEvents, ...dayGlobalEvents] };
  };

  const selectedDetails = selectedDay ? getDayDetails(selectedDay) : { meds: [], events: [] };

  return (
    <div className="flex flex-col gap-10 pb-32 pt-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
           <div className="hidden sm:block scale-75 origin-left">
              <Clock value={currentTime} size={70} renderNumbers={false} />
           </div>
           <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none">Namaste!</h2>
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                <span className="text-[10px] text-blue-600 font-bold tracking-widest leading-none">
                  {dayjs().format('hh:mm:ss A')}
                </span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{user?.name || 'User'}</h1>
           </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-lg" />
          <div className="relative w-14 h-14 rounded-2xl border-4 border-white shadow-2xl bg-blue-100 flex items-center justify-center overflow-hidden rotate-3 hover:rotate-0 transition-transform">
            <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=User`} alt="User Avatar" />
          </div>
        </div>
      </div>

      {/* Emergency Siren Button */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 -mt-4 mb-2"
      >
        <a 
          href="tel:102"
          className="w-full bg-rose-600 text-white rounded-[32px] p-5 flex items-center justify-between shadow-xl shadow-rose-200 group relative overflow-hidden active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4 relative z-20">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                <Siren size={28} className="text-white" />
             </div>
             <div>
                <h4 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">Emergency SOS</h4>
                <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest opacity-80">Tap to call Ambulance (102)</p>
             </div>
          </div>
          <ChevronRight size={24} className="text-white opacity-50 group-hover:translate-x-1 transition-transform relative z-20" />
          
          {/* Animated Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-500 z-10" />
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-15" />
        </a>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-3 gap-4 px-6">
        {quickActions.map((action, idx) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200 }}
          >
            <Link 
              to={action.path}
              className="flex flex-col items-center justify-center p-5 rounded-[32px] bg-white shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group h-full"
            >
              <div className={clsx(
                "p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform", 
                action.color.replace('bg-', 'bg-opacity-10 ')
              )}>
                <action.icon size={28} className={action.color.split(' ')[1]} />
              </div>
              <span className="text-[10px] font-black text-slate-900 text-center leading-tight uppercase tracking-widest">
                {action.id}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Horizontal Reminders Section */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-3">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
             Timeline
          </h3>
          <Link to="/reminders" className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline">Full Log</Link>
        </div>

        <div className="flex flex-col gap-3">
          {upcomingReminders.length > 0 ? upcomingReminders.map((reminder) => (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              key={reminder.id} 
              className="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  reminder.taken ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                )}>
                  {reminder.taken ? <Bell size={18} /> : <ClockIcon size={18} />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{reminder.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{reminder.displayTime} • {reminder.dosage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={clsx(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  reminder.status.color
                )}>
                  {reminder.status.label}
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteConfirm({ id: reminder.id, type: 'med' });
                  }}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="py-12 bg-white border border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-3">
               <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><Bell size={24} /></div>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Routine is Clear</p>
            </div>
          )}
        </div>
      </section>

      {/* Daily Health Tips */}
      <section className="mb-2">
        <div className="flex items-center justify-between mb-6 px-6">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-3">
             <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
             Wisdom
          </h3>
          <span className="text-[9px] bg-slate-900 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest">Verified</span>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide px-6">
          {healthTips.map((tip) => (
            <div 
              key={tip.id} 
              className={clsx(
                "flex-shrink-0 w-52 rounded-[44px] p-7 relative overflow-hidden group shadow-2xl transition-all hover:-translate-y-2",
                tip.color
              )}
            >
              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div className="w-14 h-14 bg-white/20 rounded-[22px] flex items-center justify-center text-2xl backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform">
                  {tip.icon}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tighter leading-tight">{tip.title}</h4>
                  <p className={clsx("text-xs font-bold opacity-90 leading-relaxed", tip.accent)}>
                    {tip.desc}
                  </p>
                </div>
              </div>
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -translate-x-12 translate-y-12" />
            </div>
          ))}
        </div>
      </section>

      {/* Full Interactive Calendar Integration */}
      <section className="px-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-3">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
             Health Matrix
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Schedule</p>
        </div>

        <div className="bg-white rounded-[48px] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
           <div className="calendar-container mb-8">
              <Calendar 
                onChange={(val) => {
                  if (val instanceof Date) {
                    setSelectedDay(dayjs(val).format('YYYY-MM-DD'));
                  }
                }}
                value={selectedDay ? dayjs(selectedDay).toDate() : new Date()}
                className="border-none w-full font-bold"
                tileClassName={({ date }) => {
                  const dateStr = dayjs(date).format('YYYY-MM-DD');
                  const dayOfWeek = dayjs(date).day();
                  const hasReminder = medicines.some(m => {
                    if (m.frequency === 'custom') return m.customDates?.includes(dateStr);
                    if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
                       const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                       return days.includes(dayOfWeek);
                    }
                    return false;
                  });
                  const hasEvent = [...events, ...filteredGlobalEvents].some(e => dayjs(e.date).format('YYYY-MM-DD') === dateStr);
                  return (hasReminder || hasEvent) ? 'has-reminder' : '';
                }}
              />
           </div>
           
           <style>{`
             .react-calendar {
               border: none !important;
               font-family: inherit !important;
               width: 100% !important;
             }
             .react-calendar__navigation button {
               color: #0f172a;
               font-weight: 800;
               text-transform: uppercase;
               font-size: 10px;
               letter-spacing: 0.1em;
             }
             .react-calendar__month-view__weekdays__weekday {
               font-size: 9px;
               font-weight: 900;
               text-transform: uppercase;
               color: #94a3b8;
               padding-bottom: 20px;
             }
             .react-calendar__tile {
               padding: 20px 10px !important;
               border-radius: 16px !important;
               font-weight: 700;
               font-size: 12px;
               color: #1e293b;
             }
             .react-calendar__tile--now {
               background: #f1f5f9 !important;
               color: #0f172a !important;
             }
             .react-calendar__tile--active {
               background: #2563eb !important;
               color: white !important;
               box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
             }
             .has-reminder::after {
               content: '';
               display: block;
               width: 4px;
               height: 4px;
               background: #f43f5e;
               border-radius: 50%;
               margin: 4px auto 0;
             }
           `}</style>
           
           {/* Detailed Log for Selected Day */}
           <AnimatePresence mode="wait">
             {selectedDay && (
               <motion.div 
                 key={selectedDay}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="mt-10 pt-8 border-t border-slate-50"
               >
                 <div className="flex items-center justify-between mb-6 px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayjs(selectedDay).format('dddd, MMM DD')}</p>
                    <div className="flex gap-2">
                       {selectedDetails.meds.length > 0 && <span className="text-[8px] bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-black uppercase">{selectedDetails.meds.length} Meds</span>}
                       {selectedDetails.events.length > 0 && <span className="text-[8px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase">{selectedDetails.events.length} Events</span>}
                    </div>
                 </div>

                 <div className="space-y-2">
                    {selectedDetails.meds.map(med => {
                      const status = getTimeStatus(med.displayTime, selectedDay!, med.taken);
                      return (
                        <div key={med.id} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl group hover:shadow-lg transition-all">
                           <div className="flex items-center gap-3">
                              <div className={clsx(
                                "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                                med.taken ? "bg-emerald-50 text-emerald-500" : (status.label === 'Missed' ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500")
                              )}><Pill size={14} /></div>
                              <div>
                                 <div className="flex items-center gap-2">
                                   <p className="text-xs font-black uppercase tracking-tight">{med.title}</p>
                                   {status.label === 'Missed' && (
                                     <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md font-black uppercase">Missed</span>
                                   )}
                                   {status.label.startsWith('In') && (
                                     <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-black uppercase">{status.label}</span>
                                   )}
                                 </div>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{med.dosage} • {med.displayTime}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setDeleteConfirm({ id: med.id, type: 'med' });
                               }}
                               className="p-1.5 text-slate-400 hover:text-rose-500 transition-opacity"
                             >
                               <Trash2 size={12} />
                             </button>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (selectedDay) {
                                   const baseId = med.id.replace(/-[12]$/, '');
                                   toggleMedicine(baseId, selectedDay, med.slot);
                                 }
                               }}
                               className={clsx(
                                 "w-6 h-6 rounded-full border-2 border-white shadow-sm transition-all active:scale-125",
                                 med.taken ? "bg-emerald-500" : "bg-rose-200"
                               )} 
                             />
                           </div>
                        </div>
                      );
                    })}
                    {selectedDetails.events.map(event => (
                      <div key={event.id} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl group hover:shadow-lg transition-all">
                         <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-8 h-8 rounded-xl flex items-center justify-center",
                              (event as any).type === 'public' ? "bg-indigo-50 text-indigo-500" : "bg-blue-50 text-blue-600"
                            )}>
                              {(event as any).type === 'public' ? <Megaphone size={14} /> : <Stethoscope size={14} />}
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-tight">{event.title}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{event.time} • {event.category}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ id: event.id, type: 'event' });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                            {(event as any).type === 'public' ? (
                              <div className="bg-indigo-50 px-2 py-1 rounded-full text-indigo-600 text-[8px] font-black uppercase flex items-center gap-1">
                                 <Megaphone size={8} /> Admin
                              </div>
                            ) : (
                              <div className="text-[9px] font-black text-blue-600 uppercase italic">Active</div>
                            )}
                         </div>
                      </div>
                    ))}
                    {selectedDetails.meds.length === 0 && selectedDetails.events.length === 0 && (
                      <p className="text-center py-6 text-[10px] text-slate-300 font-black uppercase tracking-widest">No plans for this date</p>
                    )}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
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
              <h3 className="text-xl font-black text-slate-900 mb-2 font-sans">Delete Entry?</h3>
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
                  className="py-4 bg-rose-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all"
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

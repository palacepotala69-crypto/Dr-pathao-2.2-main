import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Pill,
  Stethoscope,
  Bell,
  Activity,
  CalendarDays,
  Baby,
  Edit3,
  Trash2,
  Loader2,
  Globe,
  ClipboardList,
  FlaskConical,
  Megaphone,
  AlertTriangle
} from 'lucide-react';
import dayjs from '../utils/date';
import { useCalendarStore } from '../store/useCalendarStore';
import { useReminderStore } from '../store/useReminderStore';
import { clsx } from 'clsx';
import { CalendarEvent } from '../types';

interface CalendarComponentProps {
  showAgenda?: boolean;
  onEditEvent?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}

export default function CalendarComponent({ 
  showAgenda = true, 
  onEditEvent, 
  onAddEvent 
}: CalendarComponentProps) {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const { events, globalEvents, toggleEventStatus, deleteEvent, isLoading: isCalendarLoading } = useCalendarStore();
  const { medicines, toggleMedicine, isLoading: isReminderLoading } = useReminderStore();

  const isLoading = isCalendarLoading || isReminderLoading;

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const monthName = currentDate.format('MMMM');
  const year = currentDate.format('YYYY');

  const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

  // Virtual events from reminders based on frequency
  const reminderEvents: CalendarEvent[] = medicines.flatMap(m => {
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
          id: `reminder-${m.id}-1`,
          title: `${m.title} (${m.dosage})`,
          date: dateStr, 
          time: m.time,
          type: 'personal',
          category: 'medication' as const,
          status: !!m.takenLogs?.[`${dateStr}_1`] ? 'completed' : 'pending' as const,
          isReminder: true,
          reminderId: m.id,
          slot: 1
        } as any,
        {
          id: `reminder-${m.id}-2`,
          title: `${m.title} (${m.dosage})`,
          date: dateStr, 
          time: m.time2 || '20:00',
          type: 'personal',
          category: 'medication' as const,
          status: !!m.takenLogs?.[`${dateStr}_2`] ? 'completed' : 'pending' as const,
          isReminder: true,
          reminderId: m.id,
          slot: 2
        } as any
      ];
    }

    return [{
      id: `reminder-${m.id}`,
      title: `${m.title} (${m.dosage})`,
      date: dateStr, 
      time: m.time,
      type: 'personal',
      category: 'medication' as const,
      status: !!m.takenLogs?.[dateStr] ? 'completed' : 'pending' as const,
      isReminder: true,
      reminderId: m.id
    } as any];
  });

  const getTimeStatus = (timeStr: string, dateStr: string, status: string) => {
    if (status === 'completed') return { label: 'Done', color: 'text-emerald-500 bg-emerald-50' };
    
    const now = dayjs();
    const target = dayjs(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm');
    
    if (now.isAfter(target)) {
      return { label: 'Missed', color: 'text-rose-500 bg-rose-50' };
    }
    
    const diffMins = target.diff(now, 'minute');
    if (diffMins < 60) return { label: `${diffMins}m`, color: 'text-amber-500 bg-amber-50' };
    return { label: 'Pending', color: 'text-slate-400 bg-slate-50' };
  };

  const allEvents = [...events, ...globalEvents, ...reminderEvents];

  const calendarDays = [];
  const totalDaysInMonth = endOfMonth.date();
  const firstDayOfWeek = startOfMonth.day();

  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= totalDaysInMonth; i++) {
    calendarDays.push(i);
  }

  const getCategoryIcon = (category: CalendarEvent['category'], eventType?: string) => {
    if (eventType === 'public') return <Megaphone size={16} />;
    switch (category) {
      case 'medication': return <Pill size={16} />;
      case 'appointment': return <Stethoscope size={16} />;
      case 'alert': return <Bell size={16} />;
      case 'cycle': return <Activity size={16} />;
      case 'vaccination': return <Baby size={16} />;
      case 'screening': return <ClipboardList size={16} />;
      case 'health_day': return <Globe size={16} />;
      case 'lab_test': return <FlaskConical size={16} />;
      default: return <CalendarIcon size={16} />;
    }
  };

  const getCategoryColor = (category: CalendarEvent['category']) => {
    switch (category) {
      case 'medication': return 'text-blue-600 bg-blue-50';
      case 'appointment': return 'text-purple-600 bg-purple-50';
      case 'alert': return 'text-amber-600 bg-amber-50';
      case 'cycle': return 'text-rose-600 bg-rose-50';
      case 'vaccination': return 'text-teal-600 bg-teal-50';
      case 'screening': return 'text-indigo-600 bg-indigo-50';
      case 'health_day': return 'text-emerald-600 bg-emerald-50';
      case 'lab_test': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{year}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg">{monthName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-100">
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[10px] font-black text-slate-300 uppercase py-2">{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={idx} className="aspect-square opacity-0 pointer-events-none" />;
            
            const dateStr = currentDate.date(day).format('YYYY-MM-DD');
            const dayEvents = [...events, ...globalEvents].filter(e => e.date === dateStr);
            const hasReminders = medicines.some(m => {
              const d = currentDate.date(day).format('YYYY-MM-DD');
              const dOfWeek = currentDate.date(day).day();
              if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
                const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                return days.includes(dOfWeek);
              }
              if (m.frequency === 'custom') return m.customDates?.includes(d);
              return false;
            });
            
            const hasAppointment = dayEvents.some(e => e.category === 'appointment');
            const hasLab = dayEvents.some(e => e.category === 'lab_test');
            const hasPublic = dayEvents.some(e => e.type === 'public');
            
            const isToday = dayjs().isSame(currentDate.date(day), 'day');
            const isSelected = selectedDate.isSame(currentDate.date(day), 'day');

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDate(currentDate.date(day))}
                className={clsx(
                  "aspect-square flex flex-col items-center justify-center transition-all relative cursor-pointer rounded-xl",
                  isSelected ? "bg-slate-900 text-white scale-105 z-10 shadow-lg" : isToday ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className="text-xs font-bold">{day}</span>
                <div className="flex gap-0.5 mt-1">
                  {hasAppointment && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                  {hasReminders && <div className="w-1 h-1 rounded-full bg-rose-500" />}
                  {hasLab && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                  {hasPublic && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda */}
      {showAgenda && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays size={14} />
              Agenda: {selectedDate.format('MMM D')}
            </h3>
            {onAddEvent && (
              <button 
                onClick={onAddEvent}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                + Add Event
              </button>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-20">
                <Loader2 className="animate-spin text-slate-400" size={24} />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Syncing...</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {allEvents.filter(e => dayjs(e.date).isSame(selectedDate, 'day')).length > 0 ? (
                  allEvents.filter(e => dayjs(e.date).isSame(selectedDate, 'day')).map((event) => (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={clsx(
                        "bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm transition-all relative overflow-hidden group",
                        event.status === 'completed' && "opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                          event.type === 'public' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : getCategoryColor(event.category)
                        )}>
                          {getCategoryIcon(event.category, event.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className={clsx("font-bold text-slate-900 truncate text-sm", event.status === 'completed' && "line-through grayscale opacity-40")}>
                                {event.title}
                              </h4>
                              {event.type === 'public' && (
                                <span className="bg-indigo-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 flex items-center gap-1 shadow-lg shadow-indigo-200">
                                  <Megaphone size={8} /> Broadcast
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                               <div className={clsx(
                                 "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                 getTimeStatus(event.time || '00:00', event.date, event.status).color
                               )}>
                                 {getTimeStatus(event.time || '00:00', event.date, event.status).label}
                               </div>
                              {!(event as any).isReminder && event.type !== 'public' && onEditEvent && (
                                <button 
                                  onClick={() => onEditEvent(event)}
                                  className="p-1.5 rounded-lg text-slate-200 bg-slate-50 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => (event as any).isReminder ? toggleMedicine((event as any).reminderId, selectedDate.format('YYYY-MM-DD'), (event as any).slot) : toggleEventStatus(event.id)}
                                className={clsx(
                                  "p-1.5 rounded-lg transition-colors",
                                  event.status === 'completed' ? "text-emerald-500 bg-emerald-50" : "text-slate-200 bg-slate-50 hover:text-emerald-500 hover:bg-emerald-50"
                                )}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              {!(event as any).isReminder && event.type !== 'public' && (
                                <button 
                                  onClick={() => deleteEvent(event.id)}
                                  className="p-1.5 rounded-lg text-slate-200 bg-slate-50 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-500 mt-1">
                            {event.time && (
                              <div className="flex items-center gap-1">
                                <Clock size={10} className="text-slate-400" />
                                <span className="text-[9px] font-bold">{event.time}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{event.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-[28px]">
                    <CalendarIcon size={24} className="opacity-10" />
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Healthy Day Ahead</p>
                  </div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

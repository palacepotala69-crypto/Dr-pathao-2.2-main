import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import dayjs from '../utils/date';
import { clsx } from 'clsx';

interface DoctorMiniCalendarProps {
  workingHours?: string;
  onSelectSlot: (date: string, time: string) => void;
}

export default function DoctorMiniCalendar({ workingHours, onSelectSlot }: DoctorMiniCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const generateTimeSlots = (hours: string) => {
    try {
      const parts = hours.split('-').map(p => p.trim());
      if (parts.length !== 2) return ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
      
      const start = dayjs(`2024-01-01 ${parts[0]}`, 'YYYY-MM-DD hh:mm A');
      const end = dayjs(`2024-01-01 ${parts[1]}`, 'YYYY-MM-DD hh:mm A');
      
      const slots = [];
      let current = start;
      // Filter for future slots if today
      const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
      const now = dayjs();

      while (current.isBefore(end) || current.isSame(end)) {
        if (!isToday || current.set('year', now.year()).set('month', now.month()).set('date', now.date()).isAfter(now.add(30, 'minute'))) {
          slots.push(current.format('hh:mm A'));
        }
        current = current.add(1, 'hour');
      }
      return slots.length > 0 ? slots : ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    } catch (e) {
      return ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
    }
  };

  const slots = workingHours ? generateTimeSlots(workingHours) : ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];

  return (
    <div className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-[32px] border border-slate-100/50">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-blue-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Slot</span>
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{dayjs(selectedDate).format('MMMM')}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
          const date = dayjs().add(offset, 'day');
          const isSelected = selectedDate === date.format('YYYY-MM-DD');
          return (
            <button
              key={offset}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(date.format('YYYY-MM-DD'));
                setSelectedTime(null);
              }}
              className={clsx(
                "flex flex-col items-center justify-center min-w-[50px] h-14 rounded-2xl border transition-all shrink-0",
                isSelected 
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-105" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
              )}
            >
              <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">{date.format('ddd')}</span>
              <span className="text-sm font-black tracking-tighter">{date.format('D')}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
        {slots.slice(0, 6).map((time) => (
          <button
            key={time}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTime(time);
              onSelectSlot(selectedDate, time);
            }}
            className={clsx(
              "px-4 py-2 rounded-xl text-[9px] font-black border transition-all uppercase tracking-tighter shrink-0",
              selectedTime === time 
                ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                : "bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-600"
            )}
          >
            {time}
          </button>
        ))}
        {slots.length > 6 && (
           <div className="flex items-center text-slate-300 px-2">
             <ChevronRight size={14} />
           </div>
        )}
      </div>
    </div>
  );
}

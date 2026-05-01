import React, { useEffect, useRef } from 'react';
import { useReminderStore } from '../store/useReminderStore';
import { useCalendarStore } from '../store/useCalendarStore';
import dayjs from '../utils/date';

export default function NotificationManager() {
  const { medicines } = useReminderStore();
  const { events, globalEvents, dismissedEventIds } = useCalendarStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = dayjs();
      const dateStr = now.format('YYYY-MM-DD');
      const timeStr = now.format('HH:mm');

      // Check Medicines
      medicines.forEach(m => {
        // ... (existing medication logic)
        const schedule = [];
        if (m.frequency === 'daily' || m.frequency === 'twice_daily') {
          const days = m.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
          if (days.includes(now.day())) {
             schedule.push({ time: m.time, id: `${m.id}-1` });
             if (m.frequency === 'twice_daily') {
               schedule.push({ time: m.time2 || '20:00', id: `${m.id}-2` });
             }
          }
        } else if (m.frequency === 'custom' && m.customDates?.includes(dateStr)) {
          schedule.push({ time: m.time, id: m.id });
        }

        schedule.forEach(slot => {
           if (slot.time === timeStr) {
             const key = `med-${slot.id}-${dateStr}`;
             if (!notifiedRef.current.has(key)) {
               new Notification('Medication Reminder', {
                 body: `Time to take your ${m.title} (${m.dosage})`,
                 icon: '/pwa-192x192.png'
               });
               notifiedRef.current.add(key);
             }
           }
        });
      });

      // Filter global events that are dismissed
      const activeGlobalEvents = globalEvents.filter(e => !dismissedEventIds.includes(e.id));

      // Check Events
      [...events, ...activeGlobalEvents].forEach(e => {
        if (e.date === dateStr && e.time === timeStr) {
          const key = `event-${e.id}-${dateStr}`;
          if (!notifiedRef.current.has(key)) {
             new Notification(e.type === 'public' ? 'Announcement' : 'Appointment Reminder', {
               body: e.title,
               icon: '/pwa-192x192.png'
             });
             notifiedRef.current.add(key);
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [medicines, events, globalEvents, dismissedEventIds]);

  return null;
}

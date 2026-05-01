import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useReminderStore } from '../store/useReminderStore';
import { useCalendarStore } from '../store/useCalendarStore';

export default function FirebaseSync() {
  const { user } = useAuthStore();
  const subscribeReminders = useReminderStore(state => state.subscribe);
  const subscribeCalendar = useCalendarStore(state => state.subscribe);

  useEffect(() => {
    if (user?.id) {
      const unsubReminders = subscribeReminders(user.id);
      const unsubCalendar = subscribeCalendar(user.id);

      return () => {
        unsubReminders();
        unsubCalendar();
      };
    }
  }, [user?.id, subscribeReminders, subscribeCalendar]);

  return null;
}

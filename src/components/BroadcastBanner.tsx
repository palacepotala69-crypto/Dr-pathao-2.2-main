import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, ChevronRight, Bell } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import dayjs from '../utils/date';

import { useAuthStore } from '../store/useAuthStore';

export default function BroadcastBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setAnnouncements([]);
      return;
    }
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(data);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error('Announcement sync error:', error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!isVisible || announcements.length === 0) return null;

  const current = announcements[currentIdx];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4"
      >
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 shadow-2xl rounded-[32px] overflow-hidden flex items-center p-2 gap-3 ring-4 ring-slate-900/10">
          <div className="w-12 h-12 bg-violet-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
            <Megaphone size={20} />
          </div>
          
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Global Announcement</span>
              <span className="text-[10px] text-slate-500 font-bold">• {dayjs(current.createdAt?.toDate()).fromNow()}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate uppercase tracking-tight">{current.title}</h4>
            <p className="text-[10px] text-slate-400 font-medium truncate leading-normal">{current.message}</p>
          </div>

          <div className="flex items-center gap-1 pr-2">
            {announcements.length > 1 && (
              <button 
                onClick={() => setCurrentIdx((prev) => (prev + 1) % announcements.length)}
                className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 transition-colors"
                title="Next Announcement"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <button 
              onClick={() => setIsVisible(false)}
              className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

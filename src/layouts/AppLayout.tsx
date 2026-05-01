import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Stethoscope, Bell, ShoppingBag, User, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { auth, resendVerificationEmail } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { useAuthStore } from '../store/useAuthStore';

export default function AppLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(true);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsVerified(user?.emailVerified ?? true);
    });
  }, []);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      alert('Verification email sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    ...(user?.role === 'patient' || user?.role === 'admin' ? [
      { label: 'Consult', icon: Stethoscope, path: '/consult' },
      { label: 'Pharmacy', icon: ShoppingBag, path: '/pharmacy' },
    ] : []),
    { label: 'Reminders', icon: Bell, path: '/reminders' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <div className="flex flex-col h-screen font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden bg-slate-50 text-slate-900">
      {!isVerified && (
        <div className="bg-rose-500 text-white p-3 flex items-center justify-between gap-3 text-[11px] font-bold z-50">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>Verify your email to unlock all features.</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleResend}
              disabled={isResending}
              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              {isResending ? <Loader2 size={10} className="animate-spin" /> : 'Resend'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-100 flex items-center justify-between px-6 pb-0 z-50 shadow-2xl shadow-slate-900/10 transition-all">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 w-12 transition-all relative group"
            >
              <div className={clsx(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                isActive ? "bg-slate-900 text-white shadow-xl translate-y-[-10px]" : "bg-transparent text-slate-400 group-hover:bg-slate-50"
              )}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={clsx(
                "text-[8px] font-black uppercase tracking-widest absolute bottom-0 transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

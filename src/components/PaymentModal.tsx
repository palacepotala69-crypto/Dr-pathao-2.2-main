import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, CreditCard } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

export default function PaymentModal({ isOpen, onClose, amount }: PaymentModalProps) {
  const paymentMethods = [
    { id: 'esewa', name: 'eSewa', color: 'bg-[#60bb46]', logo: 'https://vibhav.com.np/wp-content/uploads/2021/04/esewa-logo.png' },
    { id: 'khalti', name: 'Khalti', color: 'bg-[#5c2d91]', logo: 'https://blog.khalti.com/wp-content/uploads/2021/01/khalti-logo.png' },
    { id: 'fonepay', name: 'FonePay', color: 'bg-[#ed1c24]', logo: 'https://fonepay.com/wp-content/uploads/2021/03/fonepay-logo.png' },
    { id: 'card', name: 'Credit/Debit Card', color: 'bg-slate-900', icon: CreditCard },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 relative z-[110] shadow-2xl"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 sm:hidden" />
            
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-bold text-slate-900">Payment Method</h3>
                  <p className="text-xs text-slate-500 mt-1">Pay Rs. {amount} securely</p>
               </div>
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={24} />
               </div>
            </div>

            <div className="flex flex-col gap-4">
               {paymentMethods.map(method => (
                 <button
                  key={method.id}
                  onClick={() => {
                    alert(`Redirecting to ${method.name}... (Demo)`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-4 rounded-[24px] border border-slate-100 hover:border-blue-500 hover:bg-slate-50 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-slate-100`}>
                          {method.logo ? (
                            <img src={method.logo} alt={method.name} className="w-10 h-10 object-contain" />
                          ) : (
                            <method.icon className="text-slate-900" size={24} />
                          )}
                       </div>
                       <span className="font-bold text-slate-700">{method.name}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-blue-500 transition-colors" />
                 </button>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure encrypted payments</p>
               <button onClick={onClose} className="mt-4 text-slate-400 font-bold text-sm">Cancel Payment</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

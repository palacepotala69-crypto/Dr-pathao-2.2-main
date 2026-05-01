import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Trash2, ChevronRight, MapPin, X, Minus, CreditCard, Camera, Upload, Loader2, FileText, Database } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentModal from '../../components/PaymentModal';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, serverTimestamp, getDocs, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

export default function PharmacyScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isPrescriptionScanning, setIsPrescriptionScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { items, addItem, removeItem, updateQuantity, total } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const handlePrescriptionUpload = async (file: File) => {
    if (!user) {
      navigate('/profile', { state: { from: location } });
      return;
    }
    setIsProcessing(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: "Extract medicines from this prescription. Provide a list of medicine names and dosages.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              medicines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING }
                  },
                  required: ["name"]
                }
              }
            },
            required: ["medicines"]
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      
      const path = 'prescriptions';
      try {
        await addDoc(collection(db, path), {
          userId: user?.id || 'anonymous',
          title: result.title || 'Extracted Prescription',
          medicines: result.medicines,
          processedAt: serverTimestamp(),
          status: 'digitized'
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      alert(`Found ${result.medicines.length} medicines. They have been added to your medical records.`);
      setIsPrescriptionScanning(false);
    } catch (error) {
      console.error('Prescription processing error:', error);
      alert('Failed to analyze prescription. Please try a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setMedicines([]);
      setIsLoadingMedicines(false);
      return;
    }

    const q = collection(db, 'medicines');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMedicines(docs);
      setIsLoadingMedicines(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        process.env.NODE_ENV !== 'production' && console.error('Error fetching medicines:', error);
      }
      setIsLoadingMedicines(false);
    });

    return () => unsubscribe();
  }, [user]);

  const products = medicines;

  const filteredProducts = products.filter(p => 
    (p.name || p.title || p.id || '').toString().toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-5 flex flex-col gap-8 relative min-h-screen">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePrescriptionUpload(file);
        }} 
        className="hidden" 
        accept="image/*"
      />

      {/* Prescription Scanner Overlay */}
      <AnimatePresence>
        {isPrescriptionScanning && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/95" 
            />
            <div className="relative z-10 w-full flex flex-col items-center">
               <div className="flex items-center justify-between w-full mb-12">
                 <button onClick={() => setIsPrescriptionScanning(false)} className="text-white p-2">
                   <X size={24} />
                 </button>
                 <span className="text-white font-bold text-sm tracking-widest uppercase">Prescription Scanner</span>
                 <div className="w-10" />
               </div>

               <div className="w-full aspect-[3/4] border-2 border-blue-500/50 rounded-[40px] relative overflow-hidden bg-slate-800 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                  {isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-md z-30">
                       <Loader2 size={48} className="text-blue-500 animate-spin" />
                       <div className="text-center px-8">
                          <p className="text-white font-bold text-lg">Digitizing Prescription</p>
                          <p className="text-slate-400 text-xs mt-2">Our AI is reading your doctor's handwriting and cataloging your medicines...</p>
                       </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                      <FileText size={64} className="opacity-20" />
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
                  <p className="text-white font-bold mb-8">Place prescription in frame</p>
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
      {/* Cart Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setIsCartOpen(false)} 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white rounded-t-[40px] p-8 relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Your Cart</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{items.length} Items</span>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                     <ShoppingBag size={40} />
                   </div>
                   <p className="text-slate-400 font-bold text-sm">Your cart is empty</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <img src={item.img} className="w-16 h-16 rounded-xl object-cover bg-white" />
                       <div className="flex-1">
                         <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                         <p className="text-blue-600 font-bold text-xs mt-1">Rs. {item.price}</p>
                         <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-200 rounded"><Minus size={14} /></button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-200 rounded"><Plus size={14} /></button>
                         </div>
                       </div>
                       <button onClick={() => removeItem(item.id)} className="text-rose-400 p-2"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-slate-500 font-bold">Total Amount</p>
                    <p className="text-xl font-black text-slate-900">Rs. {total()}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsPaymentOpen(true);
                    }}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-95 transition-all"
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
            <MapPin size={12} className="text-blue-500" /> Delivering to Kathmandu
          </p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 relative active:scale-90 transition-transform"
          >
            <ShoppingBag size={24} className="text-slate-800" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white flex items-center justify-center rounded-full text-[10px] font-bold border-2 border-white">
                {items.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search medicines..." 
          className="w-full bg-white pl-12 pr-4 py-4 rounded-[20px] shadow-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Categories */}
      {!searchQuery && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 tracking-tight">Categories</h3>
            <span className="text-blue-600 text-xs font-bold">See All</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[
              { id: 1, name: 'Diabetes', img: 'https://images.unsplash.com/photo-1579152276506-5d5ec24432d4?auto=format&fit=crop&q=80&w=100' },
              { id: 2, name: 'Wellness', img: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=100' },
              { id: 3, name: 'Baby Care', img: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=100' },
              { id: 4, name: 'Pain Relief', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=100' },
              { id: 5, name: 'Heart', img: 'https://images.unsplash.com/photo-1550572017-f582f3b61922?auto=format&fit=crop&q=80&w=100' },
            ].map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSearchQuery(cat.name)}
                className="flex flex-col items-center gap-2 group min-w-[70px]"
              >
                <div className="w-16 h-16 rounded-[24px] overflow-hidden bg-slate-50 border-2 border-white shadow-sm ring-1 ring-slate-100 group-active:scale-95 transition-transform">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Prescription Upload Card (Simplified) */}
      {!searchQuery && (
        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex items-center justify-between">
           <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Cant find your medicine?</h3>
              <p className="text-[10px] text-slate-400 mt-1">Upload your prescription and we will find it for you.</p>
           </div>
           <button 
            onClick={() => setIsPrescriptionScanning(true)}
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-blue-600 active:scale-90 transition-transform"
           >
              <Camera size={20} />
           </button>
        </div>
      )}

      {/* Products Grid */}
      <section>
         <div className="flex items-center justify-between mb-4">
           <h3 className="font-bold text-slate-800 tracking-tight">{searchQuery ? 'Search Results' : 'Best Sellers'}</h3>
           {!searchQuery && <ChevronRight size={20} className="text-slate-400" />}
         </div>
         
         {isLoadingMedicines ? (
            <div className="col-span-2 py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-sm font-bold uppercase tracking-widest">Updating Pharmacy...</p>
            </div>
         ) : filteredProducts.length > 0 ? (
           <div className="grid grid-cols-2 gap-4">
             {filteredProducts.map(prod => (
               <div key={prod.id} className="bg-white rounded-[28px] border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all group">
                  <div className="aspect-square bg-slate-50/50 rounded-[20px] mb-3 overflow-hidden">
                    <img src={prod.img} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="px-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{prod.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{prod.brand}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-bold text-blue-600 text-sm">Rs. {prod.price}</p>
                      <button 
                        onClick={() => {
                          if (!user) {
                            navigate('/profile', { state: { from: location } });
                            return;
                          }
                          addItem(prod);
                        }}
                        className="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors active:scale-90"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
               </div>
             ))}
           </div>
         ) : (
            <div className="col-span-2 py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-8">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                <ShoppingBag size={32} />
              </div>
              <h4 className="font-bold text-slate-900 uppercase">Stock Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1 mb-8 font-medium italic uppercase tracking-widest opacity-60">Synchronizing inventory with approved vendors...</p>
            </div>
         )}
      </section>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        amount={total()} 
      />
    </div>
  );
}

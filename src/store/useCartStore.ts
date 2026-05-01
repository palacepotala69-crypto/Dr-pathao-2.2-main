import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  img: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => set((state) => {
        const existing = state.items.find(i => i.id === product.id);
        if (existing) {
          return {
            items: state.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
          };
        }
        return { items: [...state.items, { ...product, quantity: 1 }] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map(i => 
          i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        )
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    }),
    {
      name: 'dr-pathao-cart',
    }
  )
);

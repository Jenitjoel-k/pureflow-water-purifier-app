import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { computeTotals, minQty } from '../lib/pricing';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductsContext';

const CartContext = createContext(null);

// Cart is stored per account, so a dealer's bulk cart never mixes with a
// customer's retail cart on a shared device.
export function CartProvider({ children }) {
  const { user, isDealer } = useAuth();
  const { byId } = useProducts();
  const [items, setItems] = useState({}); // productId -> qty
  const [ready, setReady] = useState(false);
  const key = user ? `cart:${user.uid}` : null;

  useEffect(() => {
    setReady(false);
    if (!key) {
      setItems({});
      return;
    }
    AsyncStorage.getItem(key)
      .then((raw) => setItems(raw ? JSON.parse(raw) : {}))
      .catch(() => setItems({}))
      .finally(() => setReady(true));
  }, [key]);

  useEffect(() => {
    if (key && ready) AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => {});
  }, [items, key, ready]);

  const setQty = useCallback((productId, qty) => {
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }, []);

  const add = useCallback((product, qty) => {
    setItems((prev) => {
      const current = prev[product.id] || 0;
      const step = qty ?? (current ? 1 : minQty(product, isDealer));
      return { ...prev, [product.id]: Math.min(current + step, Math.max(product.stock || 999, 1)) };
    });
  }, [isDealer]);

  const value = useMemo(() => {
    const lines = Object.entries(items)
      .filter(([id]) => byId[id])
      .map(([id, qty]) => ({ product: byId[id], qty }));
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const belowMoq = isDealer ? lines.filter((l) => l.qty < minQty(l.product, true)) : [];
    return {
      lines,
      count,
      totals: computeTotals(lines, isDealer),
      belowMoq,
      qtyOf: (id) => items[id] || 0,
      add,
      setQty,
      remove: (id) => setQty(id, 0),
      clear: () => setItems({}),
    };
  }, [items, byId, isDealer, add, setQty]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { watchAll } from '../backend';

const ProductsContext = createContext({ products: [], byId: {}, loading: true, error: null });

export const CATEGORIES = ['Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spares'];

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => watchAll(
    'products',
    (rows) => {
      const list = rows
        .filter((p) => p.active !== false && CATEGORIES.includes(p.category))
        .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
      setProducts(list);
      setLoading(false);
      setError(null);
    },
    (e) => {
      setError(e.message);
      setLoading(false);
    },
  ), []);

  const value = useMemo(
    () => ({ products, byId: Object.fromEntries(products.map((p) => [p.id, p])), loading, error }),
    [products, loading, error],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export const useProducts = () => useContext(ProductsContext);

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
import { getCatalogItemById } from '@/config/resourceServices.js';

const CART_KEY = 'greffio_boutique_cart_v1';

const newLineId = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useShopCart = () => {
  const { value: lines, setValue: setLines } = useLocalStorage(CART_KEY, []);

  const items = useMemo(
    () => (Array.isArray(lines) ? lines : []).map((line) => {
      const catalog = getCatalogItemById(line.serviceId);
      return {
        ...line,
        catalog,
        unitPriceTtc: Number(catalog?.priceTtc || 0),
        lineTotalTtc: Number(catalog?.priceTtc || 0) * Number(line.quantity || 1),
      };
    }).filter((line) => line.catalog),
    [lines],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
    [items],
  );

  const totalTtc = useMemo(
    () => items.reduce((sum, line) => sum + line.lineTotalTtc, 0),
    [items],
  );

  const addItem = useCallback((serviceId, quantity = 1) => {
    const catalog = getCatalogItemById(serviceId);
    if (!catalog || !catalog.priceTtc || Number(catalog.priceTtc) <= 0) return false;
    setLines((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const existing = list.find((line) => line.serviceId === serviceId);
      if (existing) {
        return list.map((line) => (
          line.serviceId === serviceId
            ? { ...line, quantity: Math.min(99, Number(line.quantity || 1) + quantity) }
            : line
        ));
      }
      return [...list, { id: newLineId(), serviceId, quantity: Math.max(1, quantity) }];
    });
    return true;
  }, [setLines]);

  const setQuantity = useCallback((lineId, quantity) => {
    const qty = Math.max(0, Math.min(99, Number(quantity) || 0));
    setLines((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (qty === 0) return list.filter((line) => line.id !== lineId);
      return list.map((line) => (line.id === lineId ? { ...line, quantity: qty } : line));
    });
  }, [setLines]);

  const removeLine = useCallback((lineId) => {
    setLines((prev) => (Array.isArray(prev) ? prev : []).filter((line) => line.id !== lineId));
  }, [setLines]);

  const clearCart = useCallback(() => setLines([]), [setLines]);

  const updateLineMeta = useCallback((lineId, patch) => {
    setLines((prev) => (Array.isArray(prev) ? prev : []).map((line) => (
      line.id === lineId ? { ...line, ...patch } : line
    )));
  }, [setLines]);

  return {
    items,
    itemCount,
    totalTtc,
    addItem,
    setQuantity,
    removeLine,
    clearCart,
    updateLineMeta,
  };
};

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext(null);
const CART_PREFIX = "smart-krishi-cart-";

function readCart(ownerKey) {
  try {
    const value = JSON.parse(localStorage.getItem(`${CART_PREFIX}${ownerKey}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Unable to restore saved cart:", error);
    return [];
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const ownerKey = user?.id || "guest";
  const [cartState, setCartState] = useState(() => ({
    ownerKey,
    items: readCart(ownerKey),
  }));

  useEffect(() => {
    setCartState({ ownerKey, items: readCart(ownerKey) });
  }, [ownerKey]);

  const updateItems = useCallback((update) => {
    const items = update(readCart(ownerKey));
    localStorage.setItem(`${CART_PREFIX}${ownerKey}`, JSON.stringify(items));
    setCartState({ ownerKey, items });
  }, [ownerKey]);

  const addItem = useCallback((product, quantityKg) => {
    const current = readCart(ownerKey);
    const existing = current.find((item) => item.productId === product._id);
    const nextQuantity = (existing?.quantityKg || 0) + quantityKg;
    if (nextQuantity > product.quantityKg) {
      return `Only ${product.quantityKg} kg of ${product.name} is currently available.`;
    }

    const cartItem = {
      productId: product._id,
      name: product.name,
      category: product.category,
      image: product.image,
      location: product.location,
      farmerName: product.farmer?.name || "Local farmer",
      pricePerKg: Number(product.pricePerKg),
      quantityKg: nextQuantity,
      availableQty: product.quantityKg,
    };
    updateItems((items) => existing
      ? items.map((item) => item.productId === product._id ? cartItem : item)
      : [...items, cartItem]);
    return "";
  }, [ownerKey, updateItems]);

  const setQuantity = useCallback((productId, quantityKg) => {
    updateItems((items) => items.map((item) => item.productId === productId
      ? { ...item, quantityKg }
      : item));
  }, [updateItems]);

  const removeItem = useCallback((productId) => {
    updateItems((items) => items.filter((item) => item.productId !== productId));
  }, [updateItems]);

  const clearCart = useCallback(() => {
    updateItems(() => []);
  }, [updateItems]);

  const items = cartState.ownerKey === ownerKey ? cartState.items : [];
  const count = items.reduce((total, item) => total + item.quantityKg, 0);
  const value = useMemo(
    () => ({ items, count, addItem, setQuantity, removeItem, clearCart }),
    [items, count, addItem, setQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}

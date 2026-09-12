import React, { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    setCartItems(prev => {
      if (prev.some(i => i.product.id === product.id)) return prev;
      return [...prev, { product }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const isInCart = (productId) => cartItems.some(i => i.product.id === productId);

  const cartTotal = cartItems.reduce((sum, i) => sum + (i.product.suggested_sale_price || 0), 0);

  const clearCart = () => setCartItems([]);

  const [discountCode, setDiscountCode] = useState(null);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, isInCart, cartTotal, clearCart, discountCode, setDiscountCode }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
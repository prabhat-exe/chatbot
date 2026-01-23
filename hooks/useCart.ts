import { useState } from "react";
import { OrderItem } from "@/types";

export function useCart() {
  const [cart, setCart] = useState<OrderItem[]>([]);

  const addToCart = (orderItem: OrderItem) => {
    setCart((prevCart) => {
      // Check for existing item with same id and variation
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.item_id === orderItem.item_id &&
          item.selected_variation?.variation_id ===
            orderItem.selected_variation?.variation_id
      );

      if (existingIndex !== -1) {
        // Merge quantities
        const updatedCart = [...prevCart];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity:
            updatedCart[existingIndex].quantity + orderItem.quantity,
          total_price:
            updatedCart[existingIndex].total_price + orderItem.total_price,
        };
        return updatedCart;
      }

      // Otherwise add as new item
      return [...prevCart, orderItem];
    });
  };

  const removeFromCart = (itemId: number, variationId?: number) => {
    setCart((prev) => prev.filter(
      (item) =>
        !(item.item_id === itemId &&
          (!variationId || item.selected_variation?.variation_id === variationId))
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.total_price, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getTotalItems,
    getTotalPrice,
  };
}
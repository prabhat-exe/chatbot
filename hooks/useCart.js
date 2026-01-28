import { useState } from "react";
import { addToCart as apiAddToCart } from "../utils/api";

export function useCart() {
  const [cart, setCart] = useState([]);

  // Function to sync cart item with backend
  const syncCartWithBackend = async (orderItem) => {
    try {
      const result = await apiAddToCart(orderItem);
      console.log('Cart synced with backend:', result);
      return result;
    } catch (error) {
      console.error('Backend sync failed:', error);
      // Don't throw error - allow local cart to work even if backend fails
      return null;
    }
  };

  const addToCart = async (orderItem) => {
    console.log('🛒 Adding item to cart:', {
      item_id: orderItem.item_id,
      name: orderItem.name,
      variation: orderItem.selected_variation ? `${orderItem.selected_variation.variation_name} (+₹${orderItem.selected_variation.variation_price})` : 'None',
      addons: orderItem.addons.length > 0 ? orderItem.addons.map(a => `${a.addon_name} (+₹${a.price})`) : 'None',
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      total_price: orderItem.total_price
    });

    // First sync with backend (future-prepared)
    await syncCartWithBackend(orderItem);

    // Then update local state
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
        console.log('📦 Merged with existing item. New quantity:', updatedCart[existingIndex].quantity);
        return updatedCart;
      }

      // Otherwise add as new item
      console.log('➕ Added new item to cart');
      return [...prevCart, orderItem];
    });

    // Log current cart state
    setCart((currentCart) => {
      console.log('🛍️ Current cart contents:', currentCart.map(item => ({
        name: item.name,
        variation: item.selected_variation?.variation_name || 'None',
        addons: item.addons.length,
        quantity: item.quantity,
        total: item.total_price
      })));
      console.log('💰 Cart total:', currentCart.reduce((sum, item) => sum + item.total_price, 0));
      return currentCart;
    });
  };

  const removeFromCart = (itemId, variationId) => {
    setCart((prev) => prev.filter(
      (item) =>
        !(item.item_id === itemId &&
          (!variationId || item.selected_variation?.variation_id === variationId))
    ));
  };

  const updateQuantity = async (itemId, variationId, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      removeFromCart(itemId, variationId);
      return;
    }

    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (
          item.item_id === itemId &&
          (!variationId || item.selected_variation?.variation_id === variationId)
        ) {
          const updatedItem = {
            ...item,
            quantity: newQuantity,
            total_price: item.unit_price * newQuantity,
          };
          console.log('🔄 Updated quantity:', {
            name: item.name,
            old_quantity: item.quantity,
            new_quantity: newQuantity,
            new_total: updatedItem.total_price
          });
          return updatedItem;
        }
        return item;
      });
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalItems = () => {
    return cart.length; // Count of unique items, not total quantity
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.total_price, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  };
}
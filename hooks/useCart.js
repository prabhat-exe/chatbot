import { useState, useCallback } from "react";
import { addToCart as apiAddToCart } from "../utils/api";
import { calculateTaxFromSubCategory } from "../utils/helpers";

export function useCart() {
  const [cart, setCart] = useState([]);
  const [taxInfoMap, setTaxInfoMap] = useState({}); // Store tax info for categories

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

  // Set tax information for use when calculating item prices
  const setTaxInfo = useCallback((menuData) => {
    const newTaxInfoMap = {};
    menuData.sub_category_data?.forEach((subCategory) => {
      const categoryId = subCategory.menu_id;
      newTaxInfoMap[categoryId] = {
        tax_class: subCategory.tax_class,
        map_tax_class: subCategory.map_tax_class,
      };
    });
    setTaxInfoMap(newTaxInfoMap);
  }, []);

  const addToCart = async (orderItem) => {
    // Calculate tax details if category tax info exists
    const categoryId = orderItem.category_id;
    const taxInfo = taxInfoMap[categoryId];
    
    let taxDetails = {
      taxes: [],
      total_tax: 0,
      base_price: orderItem.unit_price,
      final_price: orderItem.unit_price,
    };

    if (taxInfo?.map_tax_class) {
      taxDetails = calculateTaxFromSubCategory(orderItem.unit_price, taxInfo.map_tax_class);
    }

    // Attach tax details to order item
    const itemWithTax = {
      ...orderItem,
      tax_details: taxDetails,
    };

    console.log('🛒 Adding item to cart:', {
      item_id: itemWithTax.item_id,
      name: itemWithTax.name,
      variation: itemWithTax.selected_variation ? `${itemWithTax.selected_variation.variation_name} (+₹${itemWithTax.selected_variation.variation_price})` : 'None',
      addons: itemWithTax.addons.length > 0 ? itemWithTax.addons.map(a => `${a.addon_name} (+₹${a.price})`) : 'None',
      quantity: itemWithTax.quantity,
      unit_price: itemWithTax.unit_price,
      total_price: itemWithTax.total_price,
      tax_details: taxDetails,
    });

    // First sync with backend (future-prepared)
    await syncCartWithBackend(itemWithTax);

    // Then update local state
    setCart((prevCart) => {
      // Check for existing item with same cart_key (includes item_id, variation, AND addons)
      const existingIndex = prevCart.findIndex(
        (item) => item.cart_key === itemWithTax.cart_key
      );

      if (existingIndex !== -1) {
        // Merge quantities only if EXACT same item (including addons)
        const updatedCart = [...prevCart];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity:
            updatedCart[existingIndex].quantity + itemWithTax.quantity,
          total_price:
            updatedCart[existingIndex].total_price + itemWithTax.total_price,
        };
        console.log('📦 Merged with existing item. New quantity:', updatedCart[existingIndex].quantity);
        return updatedCart;
      }

      // Otherwise add as new item (different variation or addons = different cart item)
      console.log('➕ Added new item to cart');
      return [...prevCart, itemWithTax];
    });

    // Log current cart state
    setCart((currentCart) => {
      console.log('🛍️ Current cart contents:', currentCart.map(item => ({
        name: item.name,
        variation: item.selected_variation?.variation_name || 'None',
        addons: item.addons.length,
        quantity: item.quantity,
        total: item.total_price,
        tax: item.tax_details?.total_tax || 0
      })));
      console.log('💰 Cart total:', currentCart.reduce((sum, item) => sum + item.total_price, 0));
      console.log('🏛️ Cart tax total:', currentCart.reduce((sum, item) => sum + (item.tax_details?.total_tax || 0) * item.quantity, 0));
      return currentCart;
    });
  };

  const removeFromCart = (cartKey) => {
    setCart((prev) => prev.filter((item) => item.cart_key !== cartKey));
  };

  const updateQuantity = async (cartKey, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      removeFromCart(cartKey);
      return;
    }

    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (item.cart_key === cartKey) {
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

  const getTotalTax = () => {
    return cart.reduce((total, item) => {
      const itemTax = (item.tax_details?.total_tax || 0) * item.quantity;
      return total + itemTax;
    }, 0);
  };

  const getTaxBreakdown = () => {
    const breakdown = {};

    cart.forEach((item) => {
      if (item.tax_details?.taxes) {
        item.tax_details.taxes.forEach((tax) => {
          if (!breakdown[tax.name]) {
            breakdown[tax.name] = {
              percentage: tax.percentage,
              amount: 0,
            };
          }
          breakdown[tax.name].amount += tax.amount * item.quantity;
        });
      }
    });

    // Round all amounts to 2 decimal places
    Object.keys(breakdown).forEach((key) => {
      breakdown[key].amount = parseFloat(breakdown[key].amount.toFixed(2));
    });

    return breakdown;
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    getTotalTax,
    getTaxBreakdown,
    setTaxInfo,
  };
}
"use client";

import "./bot.css";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { completeProfile, fetchRestaurants, placeOrder } from "../../utils/api";
import { clearSession } from "../../utils/sessionId";
import { useCart } from "../../hooks/useCart";
import { useChat } from "../../hooks/useChat";
import ChatContainer from "../../components/chat/ChatContainer";
import ChatInput from "../../components/chat/ChatInput";
import CartSummary from "../../components/CartSummary";
import AuthModal from "../../components/AuthModal";
import ProfileModal from "../../components/ProfileModal";

export default function FoodBot() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalTax, getTaxBreakdown, setTaxInfo } = useCart();
  const { messages, isLoading, sendMessage, addAssistantMessage, addUserMessage, messagesEndRef, resetChat } = useChat();
  const { isLoggedIn, login, verifyOtp, logout } = useAuth();
  const [showAuthInline, setShowAuthInline] = useState(false);
  const [authStep, setAuthStep] = useState('phone');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [showProfileInline, setShowProfileInline] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [cartGlow, setCartGlow] = useState(false);
  const [cartButtonRef, setCartButtonRef] = useState(null);
  const [floatingItem, setFloatingItem] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  useEffect(() => {
    const bootstrapRestaurants = async () => {
      try {
        setRestaurantsLoading(true);
        setRestaurantsError("");
        const res = await fetchRestaurants();
        const list = res?.data || [];
        setRestaurants(list);

        const savedId = localStorage.getItem("selected_restaurant_id");
        if (savedId) {
          const matched = list.find((r) => String(r.id) === String(savedId));
          if (matched) setSelectedRestaurant(matched);
        }
      } catch (err) {
        console.error(err);
        setRestaurantsError("Unable to load restaurants. Please refresh.");
      } finally {
        setRestaurantsLoading(false);
      }
    };
    bootstrapRestaurants();
  }, []);

  // Update tax info when menu data arrives
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
   if (lastMessage?.menuData?.category_data) {
      setTaxInfo(lastMessage.menuData.category_data[0]);
      // Also store tax info locally for modal preview
      lastMessage.menuData.category_data.forEach((category) => {
        setTaxInfo(category);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const buildOrderItemFromSelection = (selection) => {
    const item = selection.item;
    const selectedVariation = selection.selectedVariation || null;
    const selectedAddons = selection.selectedAddons || [];
    const basePrice = selectedVariation
      ? Number(selectedVariation.variation_price)
      : Number(item.price || 0);
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const unitPrice = basePrice + addonsPrice;
    const addonKey = selectedAddons.length
      ? selectedAddons
          .map((addon) => Number(addon.addon_id))
          .sort((a, b) => a - b)
          .join(",")
      : "no-addons";

    return {
      cart_key: `${item.item_id}|${selectedVariation?.variation_id || "no-variation"}|${addonKey}`,
      item_id: Number(item.item_id),
      name: item.name,
      image: item.image,
      category_id: item.category_id,
      selected_variation: selectedVariation
        ? {
            variation_id: Number(selectedVariation.variation_id),
            variation_name: selectedVariation.variation_name,
            variation_price: Number(selectedVariation.variation_price),
          }
        : null,
      addons: selectedAddons.map((addon) => ({
        addon_id: Number(addon.addon_id),
        addon_name: addon.name || addon.addon_name || "Addon",
        price: Number(addon.price || 0),
      })),
      unit_price: unitPrice,
      quantity: 1,
      total_price: unitPrice,
    };
  };

  const buildVariationActions = (item) => {
    return (item.variations || []).map((variation) => ({
      id: `variation-${item.item_id}-${variation.variation_id}`,
      label: `${variation.variation_name}${Number(variation.variation_price) > 0 ? ` • ₹${variation.variation_price}` : ""}`,
      type: "select_variation",
      item,
      variation,
    }));
  };

  const buildAddonActions = (item, selectedAddons = []) => {
    const selectedAddonIds = new Set(selectedAddons.map((addon) => Number(addon.addon_id)));
    return (item.addons || []).map((addon) => {
      const addonId = Number(addon.addon_id);
      const addonName = addon.name || addon.addon_name || "Addon";
      const isSelected = selectedAddonIds.has(addonId);
      return {
        id: `addon-${item.item_id}-${addonId}`,
        label: `${isSelected ? "✓ " : ""}${addonName}${Number(addon.price) > 0 ? ` • +₹${addon.price}` : ""}`,
        type: "toggle_addon",
        item,
        addon,
      };
    });
  };

  const buildSelectionActions = (selection) => {
    if (!selection?.item) return [];

    const item = selection.item;
    const needsVariation = item.variation_status === 1 && (item.variations?.length || 0) > 0;
    const hasAddons = item.addons_status === 1 && (item.addons?.length || 0) > 0;
    const selectedAddons = selection.selectedAddons || [];

    if (needsVariation && !selection.selectedVariation) {
      return [
        ...buildVariationActions(item),
        ...(hasAddons
          ? [{ id: `show-addons-${item.item_id}`, label: "Choose Add-ons", type: "show_addons", item }]
          : []),
        ...(hasAddons && selectedAddons.length > 0
          ? [{ id: `clear-addons-${item.item_id}`, label: "Clear Add-ons", type: "clear_addons", item }]
          : []),
        { id: `cancel-${item.item_id}`, label: "Cancel", type: "cancel_selection" },
      ];
    }

    return [
      { id: `add-${item.item_id}`, label: "Add to Cart", type: "add_selected_to_cart" },
      ...(needsVariation
        ? [{ id: `change-${item.item_id}`, label: "Change Variation", type: "show_variations", item }]
        : []),
      ...(hasAddons
        ? [{ id: `show-addons-${item.item_id}`, label: "Choose Add-ons", type: "show_addons", item }]
        : []),
      ...(hasAddons && selectedAddons.length > 0
        ? [{ id: `clear-addons-${item.item_id}`, label: "Clear Add-ons", type: "clear_addons", item }]
        : []),
      { id: `cancel-${item.item_id}`, label: "Cancel", type: "cancel_selection" },
    ];
  };

  const buildPostAddActions = () => {
    return [
      { id: `open-cart-${Date.now()}`, label: "Open Cart", type: "open_cart" },
      { id: `place-order-${Date.now()}`, label: "Place Order", type: "place_order" },
    ];
  };

  const executeCheckout = async () => {
    try {
      if (!selectedRestaurant?.id) {
        addAssistantMessage({ text: "Please select a restaurant before checkout." });
        return;
      }
      if (!cart.length) {
        addAssistantMessage({ text: "Your cart is empty. Add an item first." });
        return;
      }

      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      const userId = Number(
        userData.id || userData.user_id || userData.customer_id || 0
      );

      if (!userId) {
        addAssistantMessage({ text: "Please login again to continue checkout." });
        setShowCart(false);
        setAuthStep("phone");
        setShowAuthInline(true);
        return;
      }

      const totalQuantity = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalPrice = Number(
        cart.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)
      );

      const payload = {
        user_id: userId,
        store_id: Number(selectedRestaurant.id),
        store_name: selectedRestaurant.name || "",
        order_category: 1,
        order_type: 1,
        total_quantity: totalQuantity,
        total_price: totalPrice,
        total_tax: Number((getTotalTax ? getTotalTax() : 0).toFixed(2)),
        order_comments: "",
        payment_method: "upi",
        items: cart.map((item) => ({
          item_id: Number(item.item_id),
          item_name: item.name,
          price: Number(item.unit_price),
          total_price: Number(item.total_price),
          quantity: Number(item.quantity),
          notes: "",
          customize_status: item.selected_variation || item.addons?.length ? 1 : 0,
          addon_status: item.addons?.length ? 1 : 0,
          selected_variation: item.selected_variation
            ? { variation_id: Number(item.selected_variation.variation_id) }
            : null,
          addons: (item.addons || []).map((addon) => ({
            addon_id: Number(addon.addon_id),
          })),
        })),
      };

      const result = await placeOrder(payload);
      if (result?.success) {
        clearCart();
        setShowCart(false);
        addAssistantMessage({
          text: `Your order is placed successfully. Order ID: ${result.order_id}`,
        });
      } else {
        addAssistantMessage({
          text: "Order could not be placed. Please try again.",
        });
      }
    } catch (err) {
      console.error(err);
      addAssistantMessage({
        text: "Order placement failed due to a server/network issue. Please retry.",
      });
    }
  };

  const handleMessageAction = async (action) => {
    if (!action?.type) return;

    if (action.type === "cancel_selection") {
      setPendingSelection(null);
      addAssistantMessage({ text: "Selection cancelled." });
      return;
    }

    if (action.type === "open_cart") {
      setShowCart(true);
      return;
    }

    if (action.type === "place_order") {
      await executeCheckout();
      return;
    }

    if (action.type === "show_variations") {
      const item = action.item;
      if (!item) return;
      const activeSelection =
        pendingSelection?.item?.item_id === item.item_id
          ? pendingSelection
          : { item, selectedVariation: null, selectedAddons: [] };
      setPendingSelection(activeSelection);
      addAssistantMessage({
        text: `Choose a variation for ${item.name}:`,
        actions: [
          ...buildVariationActions(item),
          { id: `cancel-${item.item_id}`, label: "Cancel", type: "cancel_selection" },
        ],
      });
      return;
    }

    if (action.type === "select_variation") {
      if (!action.item || !action.variation) return;

      const activeSelection =
        pendingSelection?.item?.item_id === action.item.item_id
          ? pendingSelection
          : { item: action.item, selectedVariation: null, selectedAddons: [] };

      const updatedSelection = {
        ...activeSelection,
        selectedVariation: action.variation,
      };
      setPendingSelection(updatedSelection);
      addAssistantMessage({
        text: `Selected ${action.variation.variation_name} for ${action.item.name}.`,
        actions: buildSelectionActions(updatedSelection),
      });
      return;
    }

    if (action.type === "show_addons") {
      const item = action.item;
      if (!item) return;
      const activeSelection =
        pendingSelection?.item?.item_id === item.item_id
          ? pendingSelection
          : { item, selectedVariation: null, selectedAddons: [] };
      const selectedAddons = activeSelection.selectedAddons || [];
      setPendingSelection(activeSelection);
      addAssistantMessage({
        text: `Choose add-ons for ${item.name} (optional):`,
        actions: [
          ...buildAddonActions(item, selectedAddons),
          { id: `done-addons-${item.item_id}`, label: "Done", type: "done_addons", item },
          ...(selectedAddons.length > 0
            ? [{ id: `clear-addons-${item.item_id}`, label: "Clear Add-ons", type: "clear_addons", item }]
            : []),
          { id: `cancel-${item.item_id}`, label: "Cancel", type: "cancel_selection" },
        ],
      });
      return;
    }

    if (action.type === "toggle_addon") {
      if (!action.item || !action.addon) return;
      const activeSelection =
        pendingSelection?.item?.item_id === action.item.item_id
          ? pendingSelection
          : { item: action.item, selectedVariation: null, selectedAddons: [] };
      const selectedAddons = activeSelection.selectedAddons || [];
      const addonId = Number(action.addon.addon_id);
      const exists = selectedAddons.some((addon) => Number(addon.addon_id) === addonId);
      const updatedAddons = exists
        ? selectedAddons.filter((addon) => Number(addon.addon_id) !== addonId)
        : [...selectedAddons, action.addon];

      const updatedSelection = {
        ...activeSelection,
        selectedAddons: updatedAddons,
      };
      setPendingSelection(updatedSelection);
      addAssistantMessage({
        text: `${updatedAddons.length} add-on${updatedAddons.length === 1 ? "" : "s"} selected for ${action.item.name}.`,
        actions: [
          ...buildAddonActions(action.item, updatedAddons),
          { id: `done-addons-${action.item.item_id}`, label: "Done", type: "done_addons", item: action.item },
          ...(updatedAddons.length > 0
            ? [{ id: `clear-addons-${action.item.item_id}`, label: "Clear Add-ons", type: "clear_addons", item: action.item }]
            : []),
          { id: `cancel-${action.item.item_id}`, label: "Cancel", type: "cancel_selection" },
        ],
      });
      return;
    }

    if (action.type === "clear_addons") {
      const item = action.item;
      if (!item) return;
      const activeSelection =
        pendingSelection?.item?.item_id === item.item_id
          ? pendingSelection
          : { item, selectedVariation: null, selectedAddons: [] };
      const updatedSelection = {
        ...activeSelection,
        selectedAddons: [],
      };
      setPendingSelection(updatedSelection);
      addAssistantMessage({
        text: `Add-ons cleared for ${item.name}.`,
        actions: buildSelectionActions(updatedSelection),
      });
      return;
    }

    if (action.type === "done_addons") {
      const item = action.item;
      if (!item) return;
      const activeSelection =
        pendingSelection?.item?.item_id === item.item_id
          ? pendingSelection
          : { item, selectedVariation: null, selectedAddons: [] };
      setPendingSelection(activeSelection);
      addAssistantMessage({
        text: `Add-on selection updated for ${item.name}.`,
        actions: buildSelectionActions(activeSelection),
      });
      return;
    }

    if (action.type === "add_selected_to_cart") {
      if (!pendingSelection?.item) {
        addAssistantMessage({ text: "Please select an item first." });
        return;
      }

      const item = pendingSelection.item;
      const needsVariation = item.variation_status === 1 && (item.variations?.length || 0) > 0;
      if (needsVariation && !pendingSelection.selectedVariation) {
        addAssistantMessage({
          text: `Please choose a variation for ${item.name} first.`,
          actions: buildSelectionActions(pendingSelection),
        });
        return;
      }

      const orderItem = buildOrderItemFromSelection(pendingSelection);
      await handleAddToCart(orderItem);
      setPendingSelection(null);
      addAssistantMessage({
        text: `${orderItem.name} added to cart.`,
        actions: buildPostAddActions(),
      });
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedRestaurant?.id) return;
    const userText = text.trim();
    const lower = userText.toLowerCase();

    if (!userText) return;

    if (lower.includes("place order")) {
      addUserMessage(userText);
      await executeCheckout();
      return;
    }

    if (pendingSelection) {
      if (lower === "cancel" || lower === "skip") {
        addUserMessage(userText);
        setPendingSelection(null);
        addAssistantMessage({ text: "Selection cancelled." });
        return;
      }

      const item = pendingSelection.item;
      const needsVariation = item.variation_status === 1 && (item.variations?.length || 0) > 0;
      let updatedSelection = { ...pendingSelection };

      if (needsVariation && !pendingSelection.selectedVariation) {
        const byNumber = Number.parseInt(lower, 10);
        if (!Number.isNaN(byNumber) && item.variations[byNumber - 1]) {
          addUserMessage(userText);
          updatedSelection.selectedVariation = item.variations[byNumber - 1];
          setPendingSelection(updatedSelection);
          addAssistantMessage({
            text: `Selected ${updatedSelection.selectedVariation.variation_name}.`,
            actions: buildSelectionActions(updatedSelection),
          });
          return;
        }

        const matched = item.variations.find((v) =>
          lower.includes((v.variation_name || "").toLowerCase())
        );
        if (matched) {
          addUserMessage(userText);
          updatedSelection.selectedVariation = matched;
          setPendingSelection(updatedSelection);
          addAssistantMessage({
            text: `Selected ${matched.variation_name}.`,
            actions: buildSelectionActions(updatedSelection),
          });
          return;
        }
      }

      if (lower.includes("add to cart")) {
        addUserMessage(userText);
        if (needsVariation && !updatedSelection.selectedVariation) {
          const list = item.variations
            .map((v, idx) => `${idx + 1}. ${v.variation_name}`)
            .join(", ");
          addAssistantMessage({
            text: `Please choose a variation first: ${list}`,
            actions: buildSelectionActions(updatedSelection),
          });
          return;
        }

        const orderItem = buildOrderItemFromSelection(updatedSelection);
        await handleAddToCart(orderItem);
        setPendingSelection(null);
        addAssistantMessage({
          text: `${orderItem.name} added to cart.`,
          actions: buildPostAddActions(),
        });
        return;
      }
    }

    // If currently on cart page, switch to chat
    if (showCart) {
      setShowCart(false);

      // small delay to allow UI transition
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    // Send message normally
    sendMessage(userText, selectedRestaurant.id);
  };

  // Handle ESC key to go back to chat
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && showCart) {
        setShowCart(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showCart, messagesEndRef]);

  // Handle page reload/leave warning
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (cart.length > 0 || messages.length > 1) { // messages.length > 1 to exclude the welcome message
        event.preventDefault();
        event.returnValue = 'You will lose your conversation and items in cart. Are you sure you want to leave?';
        return 'You will lose your conversation and items in cart. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart.length, messages.length]);

  const handleAddToCart = async (orderItem, buttonRect) => {
    if (!selectedRestaurant?.id) return;
    await addToCart(orderItem);

    // Trigger cart glow effect
    setCartGlow(true);
    setTimeout(() => setCartGlow(false), 1000);

    // Trigger floating animation if button position and cart button are available
    if (buttonRect && cartButtonRef) {
      const cartRect = cartButtonRef.getBoundingClientRect();
      const startX = buttonRect.left + buttonRect.width / 2;
      const startY = buttonRect.top + buttonRect.height / 2;
      const endX = cartRect.left + cartRect.width / 2;
      const endY = cartRect.top + cartRect.height / 2;

      setFloatingItem({
        id: Date.now(),
        startX,
        startY,
        endX,
        endY,
        item: orderItem
      });

      // Remove floating item after animation
      setTimeout(() => setFloatingItem(null), 800);
    }

  };

  const handleItemClick = (item) => {
    const needsVariation = item.variation_status === 1 && (item.variations?.length || 0) > 0;
    const hasAddons = item.addons_status === 1 && (item.addons?.length || 0) > 0;
    const selection = { item, selectedVariation: null, selectedAddons: [] };
    setPendingSelection(selection);

    if (needsVariation) {
      addAssistantMessage({
        text: `You selected ${item.name}. Choose a variation below:`,
        actions: buildSelectionActions(selection),
      });
      return;
    }

    addAssistantMessage({
      text: hasAddons
        ? `You selected ${item.name}. You can choose add-ons before adding to cart.`
        : `You selected ${item.name}.`,
      actions: buildSelectionActions(selection),
    });
  };

  const handleRestaurantSelect = (restaurant) => {
    if (!restaurant?.id) return;
    const switching = selectedRestaurant && selectedRestaurant.id !== restaurant.id;
    setSelectedRestaurant(restaurant);
    localStorage.setItem("selected_restaurant_id", String(restaurant.id));
    localStorage.setItem("selected_restaurant_name", restaurant.name || "");

    if (switching) {
      clearCart();
      clearSession();
      resetChat();
      addAssistantMessage({
        text: `Switched to ${restaurant.name}. I have reset the previous cart and chat session.`,
      });
    }
  };

  const handleSendPhoneLogin = async () => {
    try {
      setAuthLoading(true);
      setAuthMessage("");
      const res = await login({ phone_number: authPhone, phone_code: "+91" });
      if (res && res.success) {
        setAuthMessage("OTP sent. Use 123456");
        setAuthStep("otp");
      } else {
        setAuthMessage(res?.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      setAuthMessage("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyAuthOtp = async () => {
    if (authOtp !== "123456") {
      setAuthMessage("Invalid OTP. Use 123456");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const res = await verifyOtp({
        otp: authOtp,
        phone_number: authPhone,
      });

      if (res && res.success) {
        if (res.is_already != 1) {
          setProfileFirstName("");
          setProfileLastName("");
          setProfileEmail("");
          setProfileMessage("");
          setShowProfileInline(true);
          setShowAuthInline(false);
        } else {
          setAuthMessage("Logged in successfully");
          setShowAuthInline(false);
        }
      } else {
        setAuthMessage(res?.message || "OTP verification failed");
      }
    } catch (err) {
      console.error(err);
      setAuthMessage("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteUserProfile = async () => {
    if (!profileFirstName.trim() || !profileLastName.trim()) {
      setProfileMessage("First and Last name are required");
      return;
    }

    try {
      setProfileLoading(true);
      setProfileMessage("");

      const res = await completeProfile({
        phone_number: authPhone,
        first_name: profileFirstName,
        last_name: profileLastName,
        email: profileEmail,
      });

      if (res && res.success) {
        if (res.user_data) {
          localStorage.setItem("user_data", JSON.stringify(res.user_data));
        }
        setProfileMessage("Profile completed!");
        setShowProfileInline(false);
      } else {
        setProfileMessage(res?.message || "Profile update failed");
      }
    } catch (err) {
      console.error(err);
      setProfileMessage("Network error");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="food-bot-container">
      {/* Header */}
      <header className="food-bot-header">
        <div className="header-logo">
          <span>🤖</span>
        </div>
        <div className="header-info">
          <h1>{showCart ? 'Your Cart' : 'AI Food Bot'}</h1>
          <p>{showCart ? 'Review your order' : 'Chat to customize & order'}</p>
          <div className="mt-2">
            <select
              value={selectedRestaurant?.id || ""}
              onChange={(e) => {
                const picked = restaurants.find((r) => String(r.id) === e.target.value);
                handleRestaurantSelect(picked);
              }}
              disabled={restaurantsLoading}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800"
            >
              <option value="">{restaurantsLoading ? "Loading restaurants..." : "Select restaurant"}</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
            {restaurantsError && (
              <p className="mt-1 text-xs text-red-600">{restaurantsError}</p>
            )}
          </div>
        </div>
        <div className="header-cart">
          {showCart ? (
            <button
              onClick={() => {
                setShowCart(false);
                // Scroll to bottom after state update
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="back-button"
            >
              Go Back
            </button>
          ) : (
            <button
              ref={setCartButtonRef}
              disabled={!selectedRestaurant?.id}
              onClick={() => setShowCart(!showCart)}
              className={`cart-button ${cartGlow ? 'cart-glow' : ''} ${!selectedRestaurant?.id ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              🛒 Cart {getTotalItems() > 0 && `(${getTotalItems()})`}
            </button>
          )}

          
          {/* Auth Button */}
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  setAuthPhone("");
                  setAuthOtp("");
                  setAuthMessage("");
                  setAuthStep("phone");
                  setShowAuthInline((v) => !v);
                }}
                className="login-button"
              >
                Login
              </button>

            </>
          ) : (
            <button onClick={() => logout()} className="logout-button">Logout</button>
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="food-bot-main">
        <div className={`view-container ${showCart ? 'cart-active' : 'chat-active'}`}>
          {showCart ? (
            <div className="cart-view flex items-center justify-center min-h-full p-4">
              <CartSummary
                cart={cart}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onClose={() => {
                  setShowCart(false);
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                onEmptyCart={clearCart}
                getTotalTax={getTotalTax}
                getTaxBreakdown={getTaxBreakdown}
                isLoggedIn={isLoggedIn}
                onRequireLogin={() => {
                  setShowCart(false);
                  setAuthStep("phone");
                  setShowAuthInline(true);
                }}
                onProceedCheckout={executeCheckout}

              />
            </div>
          ) : selectedRestaurant?.id ? (
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onItemClick={handleItemClick}
              onAddToCart={handleAddToCart}
              onMessageAction={handleMessageAction}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-gray-600">
              <div>
                <h3 className="text-lg font-semibold">Select a restaurant to start</h3>
                <p className="mt-2 text-sm">Choose a restaurant from the dropdown in the header to load menu suggestions.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading || !selectedRestaurant?.id} />

      {/* Floating Item Animation */}
      {floatingItem && (
        <div
          key={floatingItem.id}
          className="floating-item"
          style={{
            '--start-x': `${floatingItem.startX}px`,
            '--start-y': `${floatingItem.startY}px`,
            '--end-x': `${floatingItem.endX}px`,
            '--end-y': `${floatingItem.endY}px`,
          }}
        >
          <img
            src={floatingItem.item.image || "/images/no_preview.png"}
            alt={floatingItem.item.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
      )}

      {/* Item Details Modal */}
      <AuthModal
        isOpen={showAuthInline}
        step={authStep}
        phone={authPhone}
        setPhone={setAuthPhone}
        otp={authOtp}
        setOtp={setAuthOtp}
        loading={authLoading}
        message={authMessage}
        onSendPhone={handleSendPhoneLogin}
        onVerifyOtp={handleVerifyAuthOtp}
        onClose={() => {
          setShowAuthInline(false);
          setAuthLoading(false);
        }}
      />
      <ProfileModal
        isOpen={showProfileInline}
        firstName={profileFirstName}
        setFirstName={setProfileFirstName}
        lastName={profileLastName}
        setLastName={setProfileLastName}
        email={profileEmail}
        setEmail={setProfileEmail}
        loading={profileLoading}
        message={profileMessage}
        onSubmit={handleCompleteUserProfile}
        onClose={() => {
          setShowProfileInline(false);
          setProfileLoading(false);
        }}
      />
    </div>
  );
}

"use client";

import "./bot.css";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  completeProfile,
  fetchMealPlanOptions,
  fetchRestaurants,
  generateMealPlan,
  placeOrder,
} from "../../utils/api";
import { clearSession } from "../../utils/sessionId";
import { useCart } from "../../hooks/useCart";
import { useChat } from "../../hooks/useChat";
import { calculateTaxFromSubCategory, normalizeMenuItem } from "../../utils/helpers";
import ChatContainer from "../../components/chat/ChatContainer";
import ChatInput from "../../components/chat/ChatInput";
import CartSummary from "../../components/CartSummary";
import AuthModal from "../../components/AuthModal";
import ProfileModal from "../../components/ProfileModal";
import DeliveryAddressModal from "../../components/DeliveryAddressModal";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const isPastTimeForToday = (selectedDate, selectedTime) => {
  if (!selectedDate || !selectedTime) return false;
  if (selectedDate !== getTodayDateString()) return false;
  return selectedTime < getCurrentTimeString();
};

const normalizeNameKey = (value = "") => String(value).trim().toLowerCase();
const DEFAULT_DELIVERY_ADDRESS = {
  address: "",
  lat: "",
  lng: "",
};
const MEAL_SLOT_LABELS = {
  2: ["Lunch", "Dinner"],
  3: ["Breakfast", "Lunch", "Dinner"],
  4: ["Breakfast", "Lunch", "Evening Snack", "Dinner"],
  5: ["Breakfast", "Mid-morning Snack", "Lunch", "Evening Snack", "Dinner"],
};

export default function FoodBot() {
  const { cart, addToCart, removeFromCart, updateQuantity, updateCartItem, clearCart, getTotalItems, getTotalTax, getTaxBreakdown, setTaxInfo } = useCart();
  const {
    messages,
    isLoading,
    loadingMessage,
    setLoadingMessage,
    setIsLoading,
    sendMessage,
    addAssistantMessage,
    addUserMessage,
    messagesEndRef,
    resetChat,
  } = useChat();
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
  const [orderFlow, setOrderFlow] = useState(null);
  const [mealPlanOptions, setMealPlanOptions] = useState(null);
  const [mealPlanConfig, setMealPlanConfig] = useState({
    planType: "",
    mealsPerDay: null,
    notes: "",
    awaitingNotes: false,
    hasGeneratedPlan: false,
  });
  const [scheduledDate, setScheduledDate] = useState(getTodayDateString());
  const [scheduledTime, setScheduledTime] = useState("");
  const [showDeliveryAddressModal, setShowDeliveryAddressModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DELIVERY_ADDRESS);
  const [pendingCheckoutRequest, setPendingCheckoutRequest] = useState(null);
  const [toast, setToast] = useState(null);
  const hasShownWelcomePromptRef = useRef(false);
  const toastTimeoutRef = useRef(null);
  const currencySymbol = (selectedRestaurant?.country_currency || "₹").trim() || "₹";
  const headerSubtitle = showCart
    ? "Review your order"
    : orderFlow === "meal_plan"
      ? "Plan, customize & order"
      : "Chat to customize & order";
  const deliveryAddressStorageKey = selectedRestaurant?.id
    ? `delivery_address_${selectedRestaurant.id}`
    : null;

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

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const showToast = (message, type = "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 4000);
  };

  const refreshRestaurantSelection = async (restaurantId = selectedRestaurant?.id) => {
    if (!restaurantId) return selectedRestaurant;

    const res = await fetchRestaurants();
    const list = res?.data || [];
    setRestaurants(list);

    const matched = list.find((restaurant) => String(restaurant.id) === String(restaurantId));
    if (matched) {
      setSelectedRestaurant(matched);
      localStorage.setItem("selected_restaurant_id", String(matched.id));
      return matched;
    }

    return selectedRestaurant;
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!deliveryAddressStorageKey) {
      setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
      return;
    }

    try {
      const savedAddress = localStorage.getItem(deliveryAddressStorageKey);
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        setDeliveryAddress({
          address: String(parsed?.address || ""),
          lat: String(parsed?.lat || ""),
          lng: String(parsed?.lng || ""),
        });
      } else {
        setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
      }
    } catch (error) {
      console.error("Failed to restore delivery address", error);
      setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
    }

    setPendingCheckoutRequest(null);
    setShowDeliveryAddressModal(false);
  }, [deliveryAddressStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !deliveryAddressStorageKey) return;

    const hasSavedValue = Boolean(
      String(deliveryAddress.address || "").trim() ||
      String(deliveryAddress.lat || "").trim() ||
      String(deliveryAddress.lng || "").trim()
    );

    if (!hasSavedValue) {
      localStorage.removeItem(deliveryAddressStorageKey);
      return;
    }

    localStorage.setItem(deliveryAddressStorageKey, JSON.stringify(deliveryAddress));
  }, [deliveryAddress, deliveryAddressStorageKey]);

  useEffect(() => {
    if (isPastTimeForToday(scheduledDate, scheduledTime)) {
      setScheduledTime("");
    }
  }, [scheduledDate, scheduledTime]);

  const buildOrderItemFromSelection = (selection) => {
    const item = normalizeMenuItem(selection.item || {});
    const selectedVariation = selection.selectedVariation || null;
    const selectedAddons = selection.selectedAddons || [];
    const basePrice = selectedVariation
      ? Number(selectedVariation.variation_price)
      : Number(item.price || 0);
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const unitPrice = basePrice + addonsPrice;
    const addonKeyRaw = selectedAddons.length
      ? selectedAddons
          .map((addon) => Number(addon.addon_id ?? addon.id))
          .filter((addonId) => Number.isFinite(addonId) && addonId > 0)
          .sort((a, b) => a - b)
          .join(",")
      : "no-addons";
    const addonKey = addonKeyRaw || "no-addons";

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
        addon_id: Number(addon.addon_id ?? addon.id),
        addon_name: addon.name || addon.addon_name || "Addon",
        price: Number(addon.price ?? addon.addon_price ?? addon.web_price ?? 0),
      })),
      unit_price: unitPrice,
      quantity: 1,
      total_price: unitPrice,
    };
  };

  const buildVariationActions = (item) => {
    return (item.variations || []).map((variation) => ({
      id: `variation-${item.item_id}-${variation.variation_id}`,
      label: `${variation.variation_name}${Number(variation.variation_price) > 0 ? ` • ${currencySymbol}${variation.variation_price}` : ""}`,
      type: "select_variation",
      item,
      variation,
    }));
  };

  const buildAddonActions = (item, selectedAddons = []) => {
    const normalizedItem = normalizeMenuItem(item || {});
    const selectedAddonIds = new Set(
      selectedAddons.map((addon) => Number(addon.addon_id ?? addon.id)).filter((id) => Number.isFinite(id))
    );
    return (normalizedItem.addons || []).map((addon) => {
      const addonId = Number(addon.addon_id ?? addon.id);
      const addonName = addon.name || addon.addon_name || "Addon";
      const isSelected = selectedAddonIds.has(addonId);
      return {
        id: `addon-${item.item_id}-${addonId}`,
        label: `${isSelected ? "✓ " : ""}${addonName}${Number(addon.price) > 0 ? ` • +${currencySymbol}${addon.price}` : ""}`,
        type: "toggle_addon",
        item,
        addon,
      };
    });
  };

  const buildSelectionActions = (selection) => {
    if (!selection?.item) return [];

    const item = normalizeMenuItem(selection.item);
    const needsVariation = (item.variations?.length || 0) > 0;
    const hasAddons = (item.addons?.length || 0) > 0;
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
    ];
  };

  const isMealPlanPackage = (item) => item?.type === "meal_plan_package";

  const getPlannedItemName = (plannedItem) => {
    if (typeof plannedItem === "string") return plannedItem;
    if (plannedItem && typeof plannedItem === "object") {
      return plannedItem.product_name || plannedItem.name || plannedItem.title || "";
    }
    return "";
  };

  const buildMealPlanSignature = (mealPlan = {}, planType = "", mealsPerDay = "") => {
    const source = JSON.stringify({
      planType,
      mealsPerDay,
      days: (mealPlan?.days || []).map((day) => ({
        day: day.day,
        meals: Object.fromEntries(
          Object.entries(day.meals || {}).map(([slot, items]) => [
            slot,
            (items || []).map((item) => getPlannedItemName(item)),
          ])
        ),
      })),
    });

    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
  };

  const getMealPlanDurationLabel = (planType, durationDays) => {
    const matchedOption = mealPlanOptions?.plan_durations?.find((option) => option.key === planType);
    if (matchedOption?.label) return matchedOption.label;
    if (Number(durationDays) > 0) {
      return `${durationDays} Day${Number(durationDays) === 1 ? "" : "s"}`;
    }
    return "Meal Plan";
  };

  const getMealSlotLabels = (mealsPerDay) => MEAL_SLOT_LABELS[Number(mealsPerDay)] || [];

  const buildInitialMealSlotTimes = (mealsPerDay) =>
    Object.fromEntries(getMealSlotLabels(mealsPerDay).map((slotLabel) => [slotLabel, ""]));

  const formatMealTimeDisplay = (value = "") => {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) return "";

    const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    if (!match) return normalized;

    let hours = Number(match[1]);
    const minutes = match[2];
    let period = match[3];

    if (!period) {
      period = hours >= 12 ? "PM" : "AM";
      if (hours === 0) {
        hours = 12;
      } else if (hours > 12) {
        hours -= 12;
      }
    }

    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${period}`;
  };

  const buildMealTimeNotes = (slotTimes = {}) => {
    const entries = Object.entries(slotTimes).filter(([, time]) => String(time || "").trim());
    if (!entries.length) return "";
    return `Preferred delivery times: ${entries.map(([slot, time]) => `${slot} at ${time}`).join(", ")}`;
  };

  const findMealPlanProduct = (products = [], itemName = "") => {
    const target = normalizeNameKey(itemName);
    if (!target) return null;

    return (
      products.find((product) => normalizeNameKey(product.product_name) === target) ||
      products.find((product) => normalizeNameKey(product.product_name).includes(target)) ||
      products.find((product) => target.includes(normalizeNameKey(product.product_name))) ||
      null
    );
  };

  const resolveMealPlanProduct = (products = [], plannedItem = null) => {
    if (plannedItem && typeof plannedItem === "object" && plannedItem.product_id) {
      return plannedItem;
    }

    const itemName =
      typeof plannedItem === "string"
        ? plannedItem
        : plannedItem?.product_name || plannedItem?.name || plannedItem?.title || "";

    return findMealPlanProduct(products, itemName);
  };

  const getTaxDetailsForMealPlanProduct = (product) => {
    const unitPrice = getMealPlanProductUnitPrice(product);

    if (!product?.map_tax_class) {
      return {
        taxes: [],
        total_tax: 0,
        base_price: unitPrice,
        final_price: unitPrice,
      };
    }

    return calculateTaxFromSubCategory(
      unitPrice,
      product.map_tax_class
    );
  };

  const getMealPlanDefaultVariation = (product) => {
    const variations = Array.isArray(product?.variations) ? product.variations : [];
    if (!variations.length) return null;

    const targetPrice = Number(product?.price_from ?? product?.price ?? 0);
    const matchedVariation =
      variations.find((variation) => Number(variation?.variation_price) === targetPrice) ||
      variations.reduce((lowest, variation) => {
        if (!lowest) return variation;
        return Number(variation?.variation_price ?? Infinity) < Number(lowest?.variation_price ?? Infinity)
          ? variation
          : lowest;
      }, null);

    if (!matchedVariation) return null;

    return {
      variation_id: Number(matchedVariation.variation_id),
      variation_name: matchedVariation.variation_name || "Variation",
      variation_price: Number(matchedVariation.variation_price || 0),
    };
  };

  const getMealPlanProductUnitPrice = (product) => {
    const selectedVariation = getMealPlanDefaultVariation(product);
    return selectedVariation
      ? selectedVariation.variation_price
      : Number(product?.price_from ?? product?.price ?? 0);
  };

  const buildMealPlanOrderItems = (mealPlan, products = []) => {
    const itemMap = new Map();

    (mealPlan?.days || []).forEach((day) => {
      Object.values(day.meals || {}).forEach((plannedItems) => {
        (plannedItems || []).forEach((plannedItem) => {
          const product = resolveMealPlanProduct(products, plannedItem);
          if (!product?.product_id) return;

          const itemId = Number(product.product_id);
          const selectedVariation = getMealPlanDefaultVariation(product);
          const variationKey = selectedVariation?.variation_id || "no-variation";
          const key = `${itemId}|${variationKey}|no-addons`;
          const unitPrice = selectedVariation
            ? selectedVariation.variation_price
            : Number(product.price_from ?? product.price ?? 0);

          if (!itemMap.has(key)) {
            itemMap.set(key, {
              cart_key: key,
              item_id: itemId,
              name: product.product_name,
              image: product.image_url,
              category_id: product.category_id,
              selected_variation: selectedVariation,
              addons: [],
              unit_price: unitPrice,
              quantity: 0,
              total_price: 0,
              tax_details: getTaxDetailsForMealPlanProduct(product),
            });
          }

          const existing = itemMap.get(key);
          existing.quantity += 1;
          existing.total_price = Number((existing.unit_price * existing.quantity).toFixed(2));
        });
      });
    });

    return Array.from(itemMap.values());
  };

  const buildMealPlanPackage = (mealPlan, products = [], options = {}) => {
    const flattenedItems = buildMealPlanOrderItems(mealPlan, products);
    const totalPrice = Number(
      flattenedItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2)
    );
    const totalTax = Number(getTotalTaxForItems(flattenedItems).toFixed(2));
    const totalMeals = flattenedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const durationLabel = getMealPlanDurationLabel(options.planType, mealPlan?.duration_days);
    const mealsPerDay = Number(options.mealsPerDay || mealPlan?.meals_per_day || 0);
    const cartKey = `meal-plan|${buildMealPlanSignature(mealPlan, options.planType, mealsPerDay)}`;

    return {
      type: "meal_plan_package",
      cart_type: "meal_plan_package",
      cart_key: cartKey,
      name: `${durationLabel} Meal Plan`,
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      start_date: options.startDate || "",
      meal_plan: mealPlan,
      meal_plan_products: products,
      meal_plan_summary: {
        plan_type: options.planType || "",
        duration_label: durationLabel,
        total_days: Number(mealPlan?.duration_days || (mealPlan?.days || []).length || 0),
        meals_per_day: mealsPerDay,
        total_meals: totalMeals,
        slot_times: {
          ...buildInitialMealSlotTimes(mealsPerDay),
          ...(options.slotTimes || {}),
        },
      },
      tax_details: {
        taxes: [],
        total_tax: totalTax,
        base_price: totalPrice,
        final_price: totalPrice,
      },
    };
  };

  const getTotalTaxForItems = (items = []) =>
    items.reduce((total, item) => total + ((item.tax_details?.total_tax || 0) * Number(item.quantity || 0)), 0);

  const flattenCartItemsForCheckout = (items = []) => {
    const packageItems = items.filter((item) => isMealPlanPackage(item));
    const missingStartDate = packageItems.find((item) => !String(item.start_date || "").trim());
    if (missingStartDate) {
      return {
        error: "Please select a start date for your meal plan in the cart before checkout.",
      };
    }

    const missingMealTime = packageItems.find((item) =>
      Object.values(item.meal_plan_summary?.slot_times || {}).some((time) => !String(time || "").trim())
    );
    if (missingMealTime) {
      return {
        error: "Please choose delivery times for each meal in your meal plan package before checkout.",
      };
    }

    const distinctStartDates = [...new Set(packageItems.map((item) => item.start_date).filter(Boolean))];
    if (distinctStartDates.length > 1) {
      return {
        error: "Please use the same start date for all meal plan packages before checkout.",
      };
    }

    return {
      items: items.flatMap((item) =>
        isMealPlanPackage(item)
          ? buildMealPlanOrderItems(item.meal_plan, item.meal_plan_products || [])
          : [item]
      ),
      selectedDateOverride: distinctStartDates[0] || "",
    };
  };

  const resetMealPlanConfig = () => {
    setMealPlanConfig({
      planType: "",
      mealsPerDay: null,
      notes: "",
      awaitingNotes: false,
      hasGeneratedPlan: false,
    });
  };

  const getStartFlowActions = () => ([
    { id: `start-same-day-order-${Date.now()}`, label: "Same Day Order", type: "start_same_day_order" },
    { id: `start-meal-plan-order-${Date.now()}`, label: "Meal Preparation & Order", type: "start_meal_plan_order" },
  ]);

  const buildWelcomeMessage = () => ({
    text: "Hi, I'm your AI food assistant!\n\nChoose how you'd like to order:",
    actions: getStartFlowActions(),
  });

  const promptSelectRestaurantFirst = (message = "Please select a restaurant first.") => {
    addAssistantMessage({ text: message });
  };

  useEffect(() => {
    if (restaurantsLoading || restaurantsError || hasShownWelcomePromptRef.current) return;

    hasShownWelcomePromptRef.current = true;
    addAssistantMessage(buildWelcomeMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantsLoading, restaurantsError]);

  const buildMealPlanDurationActions = (options) =>
    (options?.plan_durations || []).map((duration) => ({
      id: `meal-plan-duration-${duration.key}`,
      label: duration.label,
      type: "meal_plan_select_duration",
      planType: duration.key,
    }));

  const buildMealsPerDayActions = (options) =>
    (options?.meals_per_day_options || []).map((count) => ({
      id: `meal-plan-meals-${count}`,
      label: `${count} Meals / Day`,
      type: "meal_plan_select_meals_per_day",
      mealsPerDay: count,
    }));

  const getOrderPlacementErrorMessage = (error) => {
    const message = String(error?.message || "");
    const jsonStart = message.indexOf("{");

    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(message.slice(jsonStart));
        const errors = parsed?.details?.errors || parsed?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          return errors.join(" ");
        }
      } catch {
        // Fall through to the generic messages below.
      }
    }

    return message.includes("422")
      ? "Order placement failed. Please check the selected items and delivery details."
      : "Order placement failed due to a server/network issue. Please retry.";
  };

  const promptForMealPlanNotes = () => {
    setMealPlanConfig((prev) => ({ ...prev, awaitingNotes: true }));
    addAssistantMessage({
      text:
        mealPlanOptions?.notes_placeholder ||
        "Share your food preferences for the meal plan, or skip this step.",
      actions: [
        { id: `meal-plan-skip-notes-${Date.now()}`, label: "Skip Notes", type: "meal_plan_skip_notes" },
      ],
    });
  };

  const loadMealPlanOptions = async () => {
    const options = await fetchMealPlanOptions();
    setMealPlanOptions(options);
    addAssistantMessage({
      text: "Choose your meal plan duration:",
      actions: buildMealPlanDurationActions(options),
    });
    return options;
  };

  const runMealPlanGeneration = async (notes = "") => {
    if (!selectedRestaurant?.id) {
      promptSelectRestaurantFirst("Please select a restaurant first to generate a meal plan.");
      return;
    }

    if (!mealPlanConfig.planType || !mealPlanConfig.mealsPerDay) {
      addAssistantMessage({
        text: "Please complete the meal plan options first.",
      });
      return;
    }

    const nextNotes = [mealPlanConfig.notes, notes]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(". ");

    setMealPlanConfig((prev) => ({
      ...prev,
      notes: nextNotes,
      awaitingNotes: false,
    }));
    setLoadingMessage(
      mealPlanConfig.hasGeneratedPlan
        ? "Updating your full meal plan with your latest preference. This may take a few moments."
        : "Creating your meal plan now. This may take a few moments."
    );
    setIsLoading(true);

    try {
      const result = await generateMealPlan({
        restaurant_id: selectedRestaurant.id,
        plan_type: mealPlanConfig.planType,
        meals_per_day: mealPlanConfig.mealsPerDay,
        notes: nextNotes,
      });

      if (!result?.success) {
        addAssistantMessage({
          text: result?.error?.message || "Meal plan generation failed. Please try again.",
          actions: getStartFlowActions(),
        });
        return;
      }

      setMealPlanConfig((prev) => ({
        ...prev,
        notes: nextNotes,
        awaitingNotes: false,
        hasGeneratedPlan: true,
      }));

      addAssistantMessage({
        text: result.reply || "Your meal plan is ready.",
        mealPlan: result.meal_plan || undefined,
        mealPlanProducts: result.data?.products || [],
        actions: [
          {
            id: `meal-plan-add-all-${Date.now()}`,
            label: "Add Whole Plan to Cart",
            type: "meal_plan_add_all_to_cart",
            mealPlan: result.meal_plan || undefined,
            products: result.data?.products || [],
            planType: mealPlanConfig.planType,
            mealsPerDay: mealPlanConfig.mealsPerDay,
          },
        ],
      });
    } catch (error) {
      console.error(error);
      addAssistantMessage({
        text: "Meal plan generation failed due to a server/network issue. Please retry.",
        actions: getStartFlowActions(),
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const executeCheckout = async (checkoutItems = cart, options = {}) => {
    try {
      if (!selectedRestaurant?.id) {
        showToast("Please select a restaurant before checkout.");
        return;
      }
      if (!checkoutItems.length) {
        showToast("Your cart is empty. Add an item first.");
        return;
      }

      const flattenedCheckout = flattenCartItemsForCheckout(checkoutItems);
      if (flattenedCheckout.error) {
        showToast(flattenedCheckout.error);
        setShowCart(true);
        return;
      }

      const normalizedCheckoutItems = flattenedCheckout.items || checkoutItems;
      const effectiveSelectedDate = flattenedCheckout.selectedDateOverride || scheduledDate || "";
      const mealPlanOrderComment = checkoutItems
        .filter((item) => isMealPlanPackage(item))
        .map((item) => buildMealTimeNotes(item.meal_plan_summary?.slot_times || {}))
        .filter(Boolean)
        .join(" | ");

      if (!isLoggedIn) {
        showToast("Please login to place your order.");
        setShowCart(false);
        setAuthStep("phone");
        setShowAuthInline(true);
        return;
      }

      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      const userId = Number(
        userData.id || userData.user_id || userData.customer_id || 0
      );

      if (!userId) {
        showToast("Please login again to continue checkout.");
        setShowCart(false);
        setAuthStep("phone");
        setShowAuthInline(true);
        return;
      }

      const latestRestaurant = await refreshRestaurantSelection(selectedRestaurant.id);
      const restaurantLat = Number(latestRestaurant?.latitude);
      const restaurantLng = Number(latestRestaurant?.longitude);
      const deliveryRadiusKm = Number(latestRestaurant?.delivery_radius_km);

      if (
        !Number.isFinite(restaurantLat) ||
        !Number.isFinite(restaurantLng) ||
        !Number.isFinite(deliveryRadiusKm) ||
        deliveryRadiusKm <= 0
      ) {
        showToast("This restaurant has not configured its delivery area yet, so delivery checkout is unavailable right now.");
        return;
      }

      if (!options.addressConfirmed) {
        setPendingCheckoutRequest({ checkoutItems, options });
        setShowDeliveryAddressModal(true);
        return;
      }

      const totalQuantity = normalizedCheckoutItems.reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalPrice = Number(
        normalizedCheckoutItems.reduce((sum, item) => sum + Number(item.total_price), 0).toFixed(2)
      );
      const today = getTodayDateString();

      const isFutureOrder = Boolean(effectiveSelectedDate && effectiveSelectedDate > today);

      const payload = {
        user_id: userId,
        store_id: Number(selectedRestaurant.id),
        store_name: latestRestaurant?.name || selectedRestaurant.name || "",
        order_category: 1,
        order_type: 1,
        total_quantity: totalQuantity,
        total_price: totalPrice,
        total_tax: Number(getTotalTaxForItems(normalizedCheckoutItems).toFixed(2)),
        order_comments: mealPlanOrderComment,
        payment_method: "upi",
        selectedDate: effectiveSelectedDate,
        time: scheduledTime || "",
        pre_order_status: isFutureOrder ? 1 : 0,
        delivery_address: deliveryAddress.address,
        address_lat: Number(deliveryAddress.lat),
        address_long: Number(deliveryAddress.lng),
        items: normalizedCheckoutItems.map((item) => ({
          item_id: Number(item.item_id),
          item_name: item.name,
          price: Number(item.unit_price),
          total_price: Number(item.total_price),
          quantity: Number(item.quantity),
          notes: "",
          customize_status: item.selected_variation || item.addons?.length ? 1 : 0,
          addon_status: item.addons?.length ? 1 : 0,
          selected_variation: item.selected_variation
            ? {
                variation_id: Number(item.selected_variation.variation_id),
                variation_name: item.selected_variation.variation_name || "",
                variation_price: Number(item.selected_variation.variation_price || 0),
              }
            : null,
          addons: (item.addons || []).map((addon) => ({
            addon_id: Number(addon.addon_id),
            addon_name: addon.addon_name || addon.name || "",
            price: Number(addon.price || 0),
          })),
        })),
      };

      const result = await placeOrder(payload);
      if (result?.success) {
        if (!options.keepCartOnSuccess) {
          clearCart();
        }
        setShowCart(false);
        setShowDeliveryAddressModal(false);
        setPendingCheckoutRequest(null);
        setScheduledDate(getTodayDateString());
        setScheduledTime("");
        addAssistantMessage({
          text: options.successMessage || (
            isFutureOrder
              ? `Your future order is placed successfully and payment is completed. Order ID: ${result.order_id}`
              : `Your order is placed successfully. Order ID: ${result.order_id}`
          ),
        });
      } else {
        showToast("Order could not be placed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      showToast(getOrderPlacementErrorMessage(err));
    }
  };

  const handleMessageAction = async (action) => {
    if (!action?.type) return;

    if (
      action.type !== "start_same_day_order" &&
      action.type !== "start_meal_plan_order" &&
      !selectedRestaurant?.id
    ) {
      promptSelectRestaurantFirst("Please select a restaurant first, then continue.");
      return;
    }

    if (action.type === "start_same_day_order") {
      if (!selectedRestaurant?.id) {
        promptSelectRestaurantFirst(
          "Please select a restaurant first, then you can continue with same day ordering."
        );
        return;
      }

      setOrderFlow("same_day");
      resetMealPlanConfig();
      addUserMessage("Same Day Order");
      addAssistantMessage({
        text: "Same day order selected. Ask for any dish or category to get started.",
      });
      return;
    }

    if (action.type === "start_meal_plan_order") {
      if (!selectedRestaurant?.id) {
        promptSelectRestaurantFirst("Please select a restaurant first to generate a meal plan.");
        return;
      }

      addUserMessage("Meal Preparation & Order");
      setOrderFlow("meal_plan");
      resetMealPlanConfig();
      try {
        await loadMealPlanOptions();
      } catch (error) {
        console.error(error);
        addAssistantMessage({
          text: "I couldn't load meal plan options right now. Please try again.",
          actions: getStartFlowActions(),
        });
      }
      return;
    }

    if (action.type === "meal_plan_select_duration") {
      setMealPlanConfig((prev) => ({
        ...prev,
        planType: action.planType,
        hasGeneratedPlan: false,
        awaitingNotes: false,
      }));
      addUserMessage(action.label);
      addAssistantMessage({
        text: "How many meals would you like per day?",
        actions: buildMealsPerDayActions(mealPlanOptions),
      });
      return;
    }

    if (action.type === "meal_plan_select_meals_per_day") {
      setMealPlanConfig((prev) => ({
        ...prev,
        mealsPerDay: action.mealsPerDay,
        hasGeneratedPlan: false,
        awaitingNotes: false,
      }));
      addUserMessage(action.label);
      promptForMealPlanNotes();
      return;
    }

    if (action.type === "meal_plan_skip_notes") {
      addUserMessage("Skip Notes");
      await runMealPlanGeneration("");
      return;
    }

    if (action.type === "meal_plan_add_all_to_cart") {
      const mealPlanPackage = buildMealPlanPackage(action.mealPlan, action.products, {
        planType: action.planType,
        mealsPerDay: action.mealsPerDay,
      });
      if (!mealPlanPackage.total_price) {
        addAssistantMessage({ text: "I couldn't prepare the full meal plan package for cart." });
        return;
      }

      await handleAddToCart(mealPlanPackage);
      setShowCart(true);
      return;
    }

    if (action.type === "meal_plan_place_all_at_once") {
      const mealPlanPackage = buildMealPlanPackage(action.mealPlan, action.products, {
        planType: action.planType,
        mealsPerDay: action.mealsPerDay,
      });
      if (!mealPlanPackage.total_price) {
        addAssistantMessage({ text: "I couldn't prepare the full meal plan package for checkout." });
        return;
      }

      await handleAddToCart(mealPlanPackage);
      setShowCart(true);
      return;
    }

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
      setShowCart(true);
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

      const item = normalizeMenuItem(pendingSelection.item);
      const needsVariation = (item.variations?.length || 0) > 0;
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
    const userText = text.trim();
    const lower = userText.toLowerCase();

    if (!userText) return;

    if (!selectedRestaurant?.id) {
      promptSelectRestaurantFirst("Please select a restaurant first.");
      return;
    }

    if (mealPlanConfig.awaitingNotes) {
      addUserMessage(userText);
      await runMealPlanGeneration(userText);
      return;
    }


    if (lower.includes("place order")) {
      addUserMessage(userText);
      setShowCart(true);
      return;
    }

    if (
      orderFlow === "meal_plan" &&
      mealPlanConfig.planType &&
      mealPlanConfig.mealsPerDay &&
      mealPlanConfig.hasGeneratedPlan
    ) {
      addUserMessage(userText);
      await runMealPlanGeneration(userText);
      return;
    }

    if (pendingSelection) {
      if (lower === "cancel" || lower === "skip") {
        addUserMessage(userText);
        setPendingSelection(null);
        addAssistantMessage({ text: "Selection cancelled." });
        return;
      }

      const item = normalizeMenuItem(pendingSelection.item);
      const needsVariation = (item.variations?.length || 0) > 0;
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

  const handleMealPlanSlotTimeChange = (cartKey, slotLabel, timeValue) => {
    const mealPlanPackage = cart.find((item) => item.cart_key === cartKey);
    if (!mealPlanPackage) return;

    updateCartItem(cartKey, {
      meal_plan_summary: {
        ...(mealPlanPackage.meal_plan_summary || {}),
        slot_times: {
          ...(mealPlanPackage.meal_plan_summary?.slot_times || {}),
          [slotLabel]: formatMealTimeDisplay(timeValue),
        },
      },
    });
  };

  const handleScheduledTimeChange = (nextTime) => {
    if (isPastTimeForToday(scheduledDate, nextTime)) {
      setScheduledTime("");
      return;
    }
    setScheduledTime(nextTime);
  };

  const handleItemClick = (item) => {
    const normalizedItem = normalizeMenuItem(item || {});
    const needsVariation = (normalizedItem.variations?.length || 0) > 0;
    const hasAddons = (normalizedItem.addons?.length || 0) > 0;
    const selection = { item: normalizedItem, selectedVariation: null, selectedAddons: [] };
    setPendingSelection(selection);

    if (needsVariation) {
      addAssistantMessage({
        text: `You selected ${normalizedItem.name}. Choose a variation below:`,
        actions: buildSelectionActions(selection),
      });
      return;
    }

    addAssistantMessage({
      text: hasAddons
        ? `You selected ${normalizedItem.name}. You can choose add-ons before adding to cart.`
        : `You selected ${normalizedItem.name}.`,
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
      resetMealPlanConfig();
      setOrderFlow(null);
      setScheduledDate(getTodayDateString());
      setScheduledTime("");
      resetChat();
      addAssistantMessage({
        text: `Switched to ${restaurant.name}. Choose how you'd like to continue.`,
        actions: getStartFlowActions(),
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
      {toast && (
        <div className={`bot-toast bot-toast-${toast.type}`} role="alert">
          <span className="bot-toast-title">
            {toast.type === "error" ? "Action needed" : "Notice"}
          </span>
          <span className="bot-toast-message">{toast.message}</span>
          <button
            type="button"
            className="bot-toast-close"
            aria-label="Dismiss message"
            onClick={() => {
              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
              }
              setToast(null);
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Header */}
      <header className="food-bot-header">
        <div className="header-logo">
          <span>🤖</span>
        </div>
        <div className="header-info">
          <h1>{showCart ? 'Your Cart' : 'AI Food Bot'}</h1>
          <p>{headerSubtitle}</p>
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
            <button
              onClick={() => {
                logout();
                setAuthPhone("");
                setAuthOtp("");
                setAuthMessage("Logged out successfully.");
              }}
              className="logout-button"
            >
              Logout
            </button>
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
                currencySymbol={currencySymbol}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onMealPlanStartDateChange={(cartKey, startDate) => updateCartItem(cartKey, { start_date: startDate })}
                onMealPlanSlotTimeChange={handleMealPlanSlotTimeChange}
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
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onScheduledDateChange={setScheduledDate}
                onScheduledTimeChange={handleScheduledTimeChange}
                minDate={getTodayDateString()}
                minTime={scheduledDate === getTodayDateString() ? getCurrentTimeString() : ""}
                onRequireLogin={() => {
                  setShowCart(false);
                  setAuthStep("phone");
                  setShowAuthInline(true);
                }}
                onProceedCheckout={executeCheckout}

              />
            </div>
          ) : (
            <>
            <ChatContainer
              messages={messages}
              currencySymbol={currencySymbol}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              onItemClick={handleItemClick}
              onAddToCart={handleAddToCart}
              onMessageAction={handleMessageAction}
              messagesEndRef={messagesEndRef}
            />
            </>
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading || !selectedRestaurant?.id} />

      <DeliveryAddressModal
        isOpen={showDeliveryAddressModal}
        restaurant={selectedRestaurant}
        value={deliveryAddress}
        onChange={setDeliveryAddress}
        onClose={() => {
          setShowDeliveryAddressModal(false);
          setPendingCheckoutRequest(null);
        }}
        onConfirm={() => {
          const pendingRequest = pendingCheckoutRequest || { checkoutItems: cart, options: {} };
          executeCheckout(pendingRequest.checkoutItems, {
            ...(pendingRequest.options || {}),
            addressConfirmed: true,
          });
        }}
      />

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

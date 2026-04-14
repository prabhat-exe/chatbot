"use client";

import { useState } from "react";

function isMealPlanPackage(item) {
    return item?.type === "meal_plan_package";
}

function formatSlotLabel(slot = "") {
    return String(slot)
        .replace(/_/g, " ")
        .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}

function formatTimeValueForInput(value = "") {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) return "";

    const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    if (!match) return "";

    let hours = Number(match[1]);
    const minutes = match[2];
    const period = match[3];

    if (period === "AM") {
        if (hours === 12) hours = 0;
    } else if (period === "PM") {
        if (hours < 12) hours += 12;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function getPlannedItemName(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
        return item.product_name || item.name || item.title || "";
    }
    return "";
}

function parseWeekInfo(day) {
    const label = String(day?.label || "");
    const match = label.match(/Week\s+(\d+)\s*-\s*Day\s+(\d+)/i);

    if (match) {
        return {
            weekNumber: Number(match[1]),
            dayInWeek: Number(match[2]),
        };
    }

    const absoluteDay = Number(day?.day || 1);
    return {
        weekNumber: Math.floor((absoluteDay - 1) / 5) + 1,
        dayInWeek: ((absoluteDay - 1) % 5) + 1,
    };
}

function MealPlanPackageCard({
    item,
    currencySymbol,
    minDate,
    onRemoveItem,
    onMealPlanStartDateChange,
    onMealPlanSlotTimeChange,
}) {
    const [expanded, setExpanded] = useState(false);

    const weekGroups = (item.meal_plan?.days || []).reduce((groups, day) => {
        const { weekNumber, dayInWeek } = parseWeekInfo(day);
        const existingWeek = groups.find((group) => group.weekNumber === weekNumber);

        if (existingWeek) {
            existingWeek.days.push({ ...day, dayInWeek });
            return groups;
        }

        return [...groups, { weekNumber, days: [{ ...day, dayInWeek }] }];
    }, []);

    return (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition relative">
            {onRemoveItem && (
                <button
                    onClick={() => onRemoveItem(item.cart_key)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold transition"
                >
                    ✕
                </button>
            )}

            <div className="pr-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-semibold text-base text-gray-900">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-600">
                            {item.meal_plan_summary?.duration_label || "Meal Plan"} • {item.meal_plan_summary?.meals_per_day || 0} meals/day • {item.meal_plan_summary?.total_meals || 0} meals total
                        </p>
                    </div>
                    <p className="font-semibold text-base text-gray-900 whitespace-nowrap">
                        {currencySymbol}{(item.total_price - (item.tax_details?.total_tax || 0)).toFixed(2)}
                    </p>
                </div>

                <div className="mt-3">
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                        <span>Meal plan start date</span>
                        <input
                            type="date"
                            min={minDate}
                            value={item.start_date || ""}
                            onChange={(e) => onMealPlanStartDateChange && onMealPlanStartDateChange(item.cart_key, e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                        />
                    </label>
                    {!item.start_date && (
                        <p className="mt-1 text-xs text-amber-600">
                            Choose a start date to place this meal plan order.
                        </p>
                    )}
                </div>

                {Object.keys(item.meal_plan_summary?.slot_times || {}).length > 0 && (
                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-100/40 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                            Delivery Times
                        </p>
                        <div className="mt-2 space-y-1">
                            {Object.entries(item.meal_plan_summary.slot_times).map(([slot, time]) => (
                                <label key={`${item.cart_key}-${slot}`} className="flex flex-col gap-1 text-sm text-gray-700">
                                    <span>{slot}</span>
                                    <input
                                        type="time"
                                        value={formatTimeValueForInput(time)}
                                        onChange={(e) => onMealPlanSlotTimeChange && onMealPlanSlotTimeChange(item.cart_key, slot, e.target.value)}
                                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                    />
                                </label>
                            ))}
                        </div>
                        {Object.values(item.meal_plan_summary.slot_times).some((time) => !String(time || "").trim()) && (
                            <p className="mt-2 text-xs text-amber-600">
                                Choose a delivery time for each meal before checkout.
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                    {expanded ? "Hide package meals" : "View package meals"}
                </button>

                {expanded && (
                    <div className="mt-3 space-y-3 rounded-xl border border-blue-100 bg-white p-3">
                        {weekGroups.map((week) => (
                            <div key={`week-${week.weekNumber}`} className="space-y-2">
                                <p className="text-sm font-semibold text-gray-800">
                                    Week {week.weekNumber}
                                </p>
                                {week.days
                                    .sort((a, b) => a.dayInWeek - b.dayInWeek)
                                    .map((day) => (
                                        <div key={day.day} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                            <p className="text-sm font-semibold text-gray-800">
                                                Day {day.dayInWeek}
                                            </p>
                                            <div className="mt-2 space-y-2">
                                                {Object.entries(day.meals || {}).map(([slot, items]) => (
                                                    <div key={`${day.day}-${slot}`}>
                                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                            {formatSlotLabel(slot)}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-700">
                                                            {(items || []).map((plannedItem) => getPlannedItemName(plannedItem)).join(", ")}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CartSummary({
    cart,
    currencySymbol = "₹",
    onRemoveItem,
    onUpdateQuantity,
    onEmptyCart,
    getTotalTax,
    getTaxBreakdown,
    isLoggedIn,
    onRequireLogin,
    onProceedCheckout,
    scheduledDate,
    scheduledTime,
    onScheduledDateChange,
    onScheduledTimeChange,
    onMealPlanStartDateChange,
    onMealPlanSlotTimeChange,
    minDate,
    minTime,
}) {
    if (cart.length === 0) {
        return (
            <div className="cart-empty text-gray-500">
                <p>Your cart is empty</p>
            </div>
        );
    }

    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const totalTax = getTotalTax ? getTotalTax() : 0;
    const taxBreakdown = getTaxBreakdown ? getTaxBreakdown() : {};
    const hasMealPlanPackage = cart.some((item) => isMealPlanPackage(item));

    return (
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-5 relative text-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                    Your Cart{" "}
                    <span className="text-gray-500 font-medium">
                        ({totalItems} items)
                    </span>
                </h3>

                {onEmptyCart && cart.length > 0 && (
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to empty your cart?")) {
                                onEmptyCart();
                            }
                        }}
                        className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                        Clear Cart
                    </button>
                )}
            </div>

            <div className="space-y-4 pr-1 cartitems">
                {cart.map((item) => {
                    if (isMealPlanPackage(item)) {
                        return (
                            <MealPlanPackageCard
                                key={item.cart_key}
                                item={item}
                                currencySymbol={currencySymbol}
                                minDate={minDate}
                                onRemoveItem={onRemoveItem}
                                onMealPlanStartDateChange={onMealPlanStartDateChange}
                                onMealPlanSlotTimeChange={onMealPlanSlotTimeChange}
                            />
                        );
                    }

                    return (
                        <div
                            key={item.cart_key}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition relative"
                        >
                            {onRemoveItem && (
                                <button
                                    onClick={() => onRemoveItem(item.cart_key)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold transition"
                                >
                                    ✕
                                </button>
                            )}

                            <div className="flex justify-between items-center pr-6">
                                <div className="flex flex-col flex-1">
                                    <p className="font-semibold text-base">
                                        {item.name}
                                    </p>

                                    {item.selected_variation && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {item.selected_variation.variation_name} • +{currencySymbol}
                                            {item.selected_variation.variation_price}
                                        </p>
                                    )}

                                    {(item.addons || []).length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Add-ons:{" "}
                                            {(item.addons || []).map((addon) => addon.addon_name || addon.name).join(", ")}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {onUpdateQuantity && (
                                        <div className="flex items-center border rounded-full bg-white shadow-sm">
                                            <button
                                                onClick={() => onUpdateQuantity(item.cart_key, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="w-8 h-8 text-lg font-bold text-gray-600 hover:text-black disabled:opacity-30"
                                            >
                                                −
                                            </button>

                                            <span className="w-8 text-center font-semibold">
                                                {item.quantity}
                                            </span>

                                            <button
                                                onClick={() => onUpdateQuantity(item.cart_key, item.quantity + 1)}
                                                className="w-8 h-8 text-lg font-bold text-gray-600 hover:text-black"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}

                                    <p className="font-semibold text-base text-gray-900 min-w-[80px] text-right">
                                        {currencySymbol}{(
                                            item.total_price -
                                            (item.tax_details?.total_tax || 0) * item.quantity
                                        ).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{(subtotal - totalTax).toFixed(2)}</span>
                </div>

                {Object.keys(taxBreakdown).length > 0 &&
                    Object.entries(taxBreakdown).map(([taxName, taxData]) => (
                        <div
                            key={taxName}
                            className="flex justify-between items-center text-sm text-gray-600 mb-2"
                        >
                            <span>
                                {taxName} ({taxData.percentage}%)
                            </span>
                            <span>{currencySymbol}{taxData.amount.toFixed(2)}</span>
                        </div>
                    ))}

                <div className="flex justify-between items-center text-lg font-bold mt-3 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                        {currencySymbol}{subtotal.toFixed(2)}
                    </span>
                </div>
            </div>

            {!hasMealPlanPackage && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <h4 className="font-semibold text-sm text-gray-800">Schedule your order</h4>
                    <p className="mt-1 text-xs text-gray-600">
                        You can place a future-day order today and pay once now.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm text-gray-700">
                            <span>Delivery / pickup date</span>
                            <input
                                type="date"
                                min={minDate}
                                value={scheduledDate}
                                onChange={(e) => onScheduledDateChange && onScheduledDateChange(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-sm text-gray-700">
                            <span>Preferred time</span>
                            <input
                                type="time"
                                min={minTime || undefined}
                                value={scheduledTime}
                                onChange={(e) => onScheduledTimeChange && onScheduledTimeChange(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </label>
                    </div>
                </div>
            )}

            <div className="mt-4">
                <button
                    onClick={() => {
                        if (!isLoggedIn) {
                            if (onRequireLogin) onRequireLogin();
                        } else {
                            if (onProceedCheckout) onProceedCheckout();
                        }
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#1e40af] hover:to-[#1d4ed8] transition shadow-md"
                >
                    Proceed to Checkout
                </button>
            </div>

            <p className="mt-3 text-xs text-gray-500 text-center">
                Happy eating! 🍽️
            </p>
        </div>
    );
}

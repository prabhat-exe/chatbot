"use client";

import { useMemo, useState } from "react";

function normalizeName(value = "") {
    return String(value).trim().toLowerCase();
}

function getPlannedItemName(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
        return item.product_name || item.name || item.title || "";
    }
    return "";
}

function resolvePlannedProduct(products, item) {
    if (item && typeof item === "object" && item.product_id) {
        return item;
    }

    const target = normalizeName(getPlannedItemName(item));
    if (!target) return null;

    const exactMatch = products.find((product) => normalizeName(product.product_name) === target);
    if (exactMatch) return exactMatch;

    return (
        products.find((product) => normalizeName(product.product_name).includes(target)) ||
        products.find((product) => target.includes(normalizeName(product.product_name))) ||
        null
    );
}

function formatSlotLabel(slot = "") {
    return slot.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}

function getVariationSummary(product, currencySymbol) {
    if (!Array.isArray(product?.variations) || product.variations.length === 0) return "";

    return product.variations
        .map((variation) => {
            const name = variation.variation_name || "Option";
            const price = Number(variation.variation_price ?? 0);
            return `${name} ${currencySymbol}${price}`;
        })
        .join(" | ");
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
    const weekNumber = Math.floor((absoluteDay - 1) / 5) + 1;
    const dayInWeek = ((absoluteDay - 1) % 5) + 1;

    return { weekNumber, dayInWeek };
}

function ProductLine({ product, itemName, currencySymbol }) {
    if (!product) {
        return (
            <div className="meal-plan-line">
                <span className="meal-plan-line-name">{itemName}</span>
            </div>
        );
    }

    const displayCurrency = currencySymbol || product.currency || "₹";
    const variationSummary = getVariationSummary(product, displayCurrency);
    const basePrice = product.price_from ?? product.price ?? 0;

    return (
        <div className="meal-plan-line">
            <div className="meal-plan-line-main">
                <span className="meal-plan-line-name">{product.product_name}</span>
                {variationSummary ? (
                    <span className="meal-plan-line-variants">{variationSummary}</span>
                ) : null}
            </div>
            <span className="meal-plan-line-price">
                {displayCurrency}{basePrice}
            </span>
        </div>
    );
}

export default function MealPlanSchedule({
    mealPlan,
    products = [],
    currencySymbol,
}) {
    const weekGroups = useMemo(() => {
        if (!mealPlan?.days?.length) return [];

        const grouped = new Map();

        mealPlan.days.forEach((day) => {
            const { weekNumber, dayInWeek } = parseWeekInfo(day);
            const weekKey = `week-${weekNumber}`;

            if (!grouped.has(weekKey)) {
                grouped.set(weekKey, {
                    key: weekKey,
                    weekNumber,
                    label: `Week ${weekNumber}`,
                    days: [],
                });
            }

            grouped.get(weekKey).days.push({
                ...day,
                dayInWeek,
                shortLabel: `Day ${dayInWeek}`,
            });
        });

        return Array.from(grouped.values()).map((week) => ({
            ...week,
            days: week.days.sort((a, b) => a.dayInWeek - b.dayInWeek),
        }));
    }, [mealPlan]);

    const firstWeekKey = weekGroups[0]?.key || "";
    const [activeWeek, setActiveWeek] = useState(firstWeekKey);
    const [expandedDays, setExpandedDays] = useState(() => {
        const firstDay = weekGroups[0]?.days?.[0]?.day;
        return firstDay ? { [firstDay]: true } : {};
    });

    const selectedWeek = weekGroups.find((week) => week.key === activeWeek) || weekGroups[0];

    const toggleDay = (dayNumber) => {
        setExpandedDays((current) => ({
            ...current,
            [dayNumber]: !current[dayNumber],
        }));
    };

    if (!weekGroups.length) return null;

    return (
        <div className="meal-plan-schedule meal-plan-schedule-v2">
            <div className="meal-plan-week-tabs" role="tablist" aria-label="Meal plan weeks">
                {weekGroups.map((week) => (
                    <button
                        key={week.key}
                        type="button"
                        role="tab"
                        aria-selected={activeWeek === week.key}
                        className={`meal-plan-week-tab${activeWeek === week.key ? " is-active" : ""}`}
                        onClick={() => setActiveWeek(week.key)}
                    >
                        {week.label}
                    </button>
                ))}
            </div>

            <div className="meal-plan-body">
                {selectedWeek?.days.map((day, index) => {
                    const entries = Object.entries(day.meals || {});
                    const isExpanded = Boolean(expandedDays[day.day] ?? index === 0);

                    return (
                        <div key={day.day} className="meal-plan-day-group meal-plan-day-card">
                            <button
                                type="button"
                                className="meal-plan-day-toggle meal-plan-day-toggle-v2"
                                onClick={() => toggleDay(day.day)}
                                aria-expanded={isExpanded}
                            >
                                <div className="meal-plan-day-toggle-copy">
                                    <span className="meal-plan-day-toggle-title">
                                        {day.shortLabel}
                                    </span>
                                </div>
                                <span className={`meal-plan-day-toggle-icon${isExpanded ? " is-open" : ""}`}>
                                    ▾
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="meal-plan-day-content">
                                    {entries.map(([slot, items]) => (
                                        <div key={`${day.day}-${slot}`} className="meal-plan-slot-block">
                                            <div className="meal-plan-slot-badge">
                                                {formatSlotLabel(slot)}
                                            </div>
                                            <div className="meal-plan-slot-items">
                                                {(items || []).map((item, itemIndex) => (
                                                    <ProductLine
                                                        key={`${day.day}-${slot}-${getPlannedItemName(item) || "item"}-${itemIndex}`}
                                                        itemName={getPlannedItemName(item)}
                                                        product={resolvePlannedProduct(products, item)}
                                                        currencySymbol={currencySymbol}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

"use client";

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

function ProductDetails({ product, itemName, currencySymbol }) {
    if (!product) {
        return (
            <div className="meal-plan-item-card">
                <div className="meal-plan-item-header">
                    <span className="meal-plan-item-name">{itemName}</span>
                </div>
                <p className="meal-plan-item-meta">Detailed menu info is not available for this item.</p>
            </div>
        );
    }

    const displayCurrency = currencySymbol || product.currency || "₹";

    return (
        <div className="meal-plan-item-card">
            <div className="meal-plan-item-header">
                <span className="meal-plan-item-name">
                    {product.product_name}
                </span>
                <span className="meal-plan-item-price">
                    {displayCurrency}{product.price_from ?? product.price ?? 0}
                </span>
            </div>

            {Array.isArray(product.variations) && product.variations.length > 0 && (
                <div className="meal-plan-chip-row">
                    {product.variations.map((variation) => (
                        <span
                            key={`${product.product_id}-${variation.variation_id}`}
                            className="meal-plan-chip"
                        >
                            {variation.variation_name} • {displayCurrency}{variation.variation_price}
                        </span>
                    ))}
                </div>
            )}

            {Array.isArray(product.addons) && product.addons.length > 0 && (
                <div className="meal-plan-chip-row">
                    {product.addons.map((addon) => (
                        <span
                            key={`${product.product_id}-addon-${addon.addon_id}`}
                            className="meal-plan-chip meal-plan-chip-muted"
                        >
                            {addon.addon_name || addon.name} • +{displayCurrency}{addon.price}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MealPlanSchedule({
    mealPlan,
    products = [],
    currencySymbol,
}) {
    if (!mealPlan?.days?.length) return null;

    return (
        <div className="meal-plan-schedule">
            <div className="meal-plan-head">
                <span className="meal-plan-head-day">Day</span>
                <span className="meal-plan-head-slot">Meal</span>
                <span className="meal-plan-head-item">Planned Item</span>
            </div>

            <div className="meal-plan-body">
                {mealPlan.days.map((day) => {
                    const entries = Object.entries(day.meals || {});
                    return (
                        <div key={day.day} className="meal-plan-day-group">
                            {entries.map(([slot, items], slotIndex) => (
                                <div
                                    key={`${day.day}-${slot}`}
                                    className="meal-plan-row"
                                >
                                    <div className="meal-plan-day-cell">
                                        {slotIndex === 0 ? day.label || `Day ${day.day}` : ""}
                                    </div>
                                    <div className="meal-plan-slot-cell">
                                        {slot.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase())}
                                    </div>
                                    <div className="meal-plan-item-cell">
                                        {(items || []).map((item, itemIndex) => (
                                            <ProductDetails
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
                    );
                })}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { calculateTaxFromSubCategory } from "../utils/helpers";

export default function ItemDetailsModal({
    item,
    onAddToCart,
    onClose,
    taxInfoMap = {}
}) {
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedAddons, setSelectedAddons] = useState([]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const generateCartKey = (item) => {
        const variationId = item.selected_variation?.variation_id ?? "no-variation";
        const addonIds = item.addons
            .map(a => a.addon_id)
            .sort((a, b) => a - b)
            .join(",");
        return `${item.item_id}|${variationId}|${addonIds || "no-addons"}`;
    };

    const toggleAddon = (addon) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.addon_id === addon.addon_id);
            if (exists) {
                return prev.filter(a => a.addon_id !== addon.addon_id);
            }
            return [...prev, addon];
        });
    };

    const addonsPrice = selectedAddons.reduce(
        (sum, addon) => sum + Number(addon.price),
        0
    );

    const basePrice =
        selectedVariation
            ? Number(selectedVariation.variation_price)
            : item.variations.length > 0
                ? 0
                : item.price;

    const unitPrice = basePrice + addonsPrice;
    const totalPrice = unitPrice * quantity;

    // Calculate tax details for preview
    const categoryId = item.category_id;
    const taxInfo = taxInfoMap[categoryId];
    let taxDetails = {
        taxes: [],
        total_tax: 0,
        base_price: unitPrice,
        final_price: unitPrice,
    };

    if (taxInfo?.map_tax_class && unitPrice > 0) {
        taxDetails = calculateTaxFromSubCategory(unitPrice, taxInfo.map_tax_class);
    }

    const handleAddToCart = async (e) => {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const orderItem = {
            cart_key: generateCartKey({
                item_id: item.item_id,
                selected_variation: selectedVariation,
                addons: selectedAddons
            }),
            item_id: item.item_id,
            name: item.name,
            image: item.image,
            category_id: item.category_id,
            selected_variation: selectedVariation
                ? {
                    variation_id: selectedVariation.variation_id,
                    variation_name: selectedVariation.variation_name,
                    variation_price: Number(selectedVariation.variation_price),
                }
                : null,
            addons: selectedAddons.map(addon => ({
                addon_id: addon.addon_id,
                addon_name: addon.name,
                price: Number(addon.price),
            })),
            unit_price: unitPrice,
            quantity,
            total_price: totalPrice,
        };

        await onAddToCart(orderItem, buttonRect);
        onClose();
    };

    return (
        <div className="item-modal-overlay" onClick={onClose}>
            <div
                className="item-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="item-modal-close"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="item-modal-header">
                    <img
                        src={item.image || "/images/no_preview.png"}
                        alt={item.name}
                        className="item-modal-image"
                    />
                    <div className="item-modal-info">
                        <h3 className="item-modal-name">{item.name}</h3>
                        <p className="item-modal-description">Customize your order</p>
                        {item.price > 0 && !item.variations?.length && (
                            <span className="item-modal-price">₹{item.price}</span>
                        )}
                    </div>
                </div>

                {/* Size/Variations */}
                {item.variations && item.variations.length > 0 && (
                    <div className="item-modal-section">
                        <p className="item-modal-section-title">
                            Size <span className="required">*</span>
                        </p>
                        <div className="item-modal-options">
                            {item.variations.map(v => {
                                const isSelected = selectedVariation?.variation_id === v.variation_id;
                                return (
                                    <button
                                        key={v.variation_id}
                                        onClick={() => setSelectedVariation(v)}
                                        className={`item-modal-option ${isSelected ? "selected" : ""}`}
                                    >
                                        {v.variation_name}
                                        {Number(v.variation_price) > 0 && (
                                            <span className="option-price">₹{v.variation_price}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add-ons */}
                {item.addons && item.addons.length > 0 && (
                    <div className="item-modal-section">
                        <p className="item-modal-section-title">Add-ons (optional)</p>
                        <div className="item-modal-options">
                            {item.addons.map(addon => {
                                const isSelected = selectedAddons.some(
                                    a => a.addon_id === addon.addon_id
                                );
                                return (
                                    <button
                                        key={addon.addon_id}
                                        onClick={() => toggleAddon(addon)}
                                        className={`item-modal-option addon ${isSelected ? "selected" : ""}`}
                                    >
                                        {addon.name}
                                        <span className="option-price">+₹{addon.price}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div className="item-modal-section">
                    <p className="item-modal-section-title">Quantity</p>
                    <div className="item-modal-quantity">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="quantity-btn-modal"
                        >
                            −
                        </button>
                        <span className="quantity-value-modal">{quantity}</span>
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="quantity-btn-modal"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Tax Details Preview */}
                {unitPrice > 0 && taxDetails.taxes.length > 0 && (
                    <div className="item-modal-section tax-preview">
                        <p className="item-modal-section-title">Tax Details (per unit)</p>
                        <div className="tax-breakdown-preview">
                            <div className="tax-row">
                                <span>Base Price</span>
                                <span>₹{(unitPrice - taxDetails.total_tax).toFixed(2)}</span>
                            </div>
                            {taxDetails.taxes.map((tax, idx) => (
                                <div key={idx} className="tax-row">
                                    <span>{tax.name} ({tax.percentage}%)</span>
                                    <span>₹{tax.amount.toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="tax-row total">
                                <span>Unit Price (incl. tax)</span>
                                <span>₹{unitPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="item-modal-actions">
                    <button
                        className="item-modal-btn cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        disabled={item.variations?.length > 0 && !selectedVariation}
                        onClick={handleAddToCart}
                        className={`item-modal-btn add ${item.variations?.length > 0 && !selectedVariation
                                ? "disabled"
                                : ""
                            }`}
                    >
                        Add to Cart • ₹{totalPrice.toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
    );
}

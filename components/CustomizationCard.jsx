"use client";

import { useState } from "react";

export default function CustomizationCard({
    item,
    onAddToCart
}) {
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedAddons, setSelectedAddons] = useState([]);

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
                ? 0 // size must be selected
                : item.price;

    const totalPrice = (basePrice + addonsPrice) * quantity;
    // console.log(item);
    return (
        <div className="flex justify-start">
            <div className="mt-4 bg-white rounded-2xl shadow-lg p-4 max-w-sm space-y-4">

                {/* Header */}
                <div className="flex items-start gap-3 pb-3 border-b">
                    <img
                        src={item.image || "/images/no_preview.png"}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">
                            {item.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                            Customize your order
                        </p>
                    </div>
                </div>

                {/* Size */}
                <div>
                    <p className="font-semibold text-sm text-gray-700 mb-2">
                        Size
                    </p>

                    {item.variations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {item.variations.map(v => {
                                const isSelected = selectedVariation?.variation_id === v.variation_id;

                                return (
                                    <button
                                        key={v.variation_id}
                                        onClick={() => setSelectedVariation(v)}   // ✅ SINGLE SELECT
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all
                        ${
                                            isSelected
                                                ? "bg-blue-900 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {v.variation_name}
                                        {Number(v.variation_price) > 0 && (
                                            <span className="ml-1 text-xs">
                                                +₹{v.variation_price}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">
                            No sizes available
                        </p>
                    )}
                </div>



                {/* Add-ons */}
                {item.addons.length > 0 && (
                    <div>
                        <p className="font-semibold text-sm text-gray-700 mb-2">
                            Add-ons (pick multiple)
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {item.addons.map(addon => {
                                const isSelected = selectedAddons.some(
                                    a => a.addon_id === addon.addon_id
                                );

                                return (
                                    <button
                                        key={addon.addon_id}
                                        onClick={() => toggleAddon(addon)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                        ${
                                            isSelected
                                                ? "bg-blue-900 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {addon.name}
                                        <span className="text-xs ml-1">+₹{addon.price}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>)}


                {/* Extras */}
                {/* <div>
            <p className="font-semibold text-sm text-gray-700 mb-2">
                Extras
            </p>
            <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200">
                Garlic Bread <span className="text-xs">+$2.99</span>
                </button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200">
                Parmesan <span className="text-xs">+$1.00</span>
                </button>
            </div>
            </div> */}

                {/* Quantity */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <p className="font-semibold text-sm text-gray-700">
                        Quantity
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1e3a8a]"
                        >
                            −
                        </button>

                        <span className="font-bold text-lg w-8 text-center text-[#1e3a8a]">
                            {quantity}
                        </span>

                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1e3a8a]"
                        >
                            +
                        </button>
                    </div>
                </div>


                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <button className="flex-1 h-11 rounded-xl border font-semibold text-[#1e3a8a] hover:bg-gray-300">
                        Cancel
                    </button>
                    <button
                        disabled={item.variations.length > 0 && !selectedVariation}
                        onClick={async () => {
                            const orderItem = {
                                item_id: item.item_id,
                                name: item.name,
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
                                unit_price: basePrice + addonsPrice,
                                quantity,
                                total_price: totalPrice,
                            };
                            console.log(orderItem);
                            await onAddToCart(orderItem); // send to page.jsx
                        }}
                        className={`flex-1 h-11 rounded-xl font-semibold ${
                            item.variations.length > 0 && !selectedVariation
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-blue-900 hover:bg-blue-800 text-white"
                        }`}
                    >
                        Add ₹{totalPrice.toFixed(2)}
                    </button>

                </div>
            </div>
        </div>
    );
}
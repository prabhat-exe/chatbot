"use client";

export default function CartSummary({ cart, onRemoveItem, onUpdateQuantity, onClose, onEmptyCart, getTotalTax, getTaxBreakdown }) {
    if (cart.length === 0) {
        return (
            <div className="cart-empty text-gray-500">
                <p>Your cart is empty</p>
            </div>
        );
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    const totalTax = getTotalTax ? getTotalTax() : 0;
    const taxBreakdown = getTaxBreakdown ? getTaxBreakdown() : {};

    // console.log("cart",cart)
    return (
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-5 relative text-gray-800">

            {/* Header */}
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

            {/* Items */}
            <div className="space-y-4 pr-1 cartitems">
                {cart.map((item) => (
                    <div
                        key={item.cart_key}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition relative"
                    >
                        {/* Cross Button */}
                        {onRemoveItem && (
                            <button
                                onClick={() => onRemoveItem(item.cart_key)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold transition"
                            >
                                ✕
                            </button>
                        )}

                        <div className="flex justify-between items-center pr-6">

                            {/* LEFT SIDE */}
                            <div className="flex flex-col flex-1">

                                {/* Product Name */}
                                <p className="font-semibold text-base">
                                    {item.name}
                                </p>

                                {/* Variation */}
                                {item.selected_variation && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {item.selected_variation.variation_name} • +₹
                                        {item.selected_variation.variation_price}
                                    </p>
                                )}

                                {/* Addons */}
                                {item.addons.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Add-ons:{" "}
                                        {item.addons.map((a) => a.addon_name).join(", ")}
                                    </p>
                                )}
                            </div>

                            {/* RIGHT SIDE */}
                            <div className="flex items-center gap-4">

                                {/* Quantity Controls */}
                                {onUpdateQuantity && (
                                    <div className="flex items-center border rounded-full bg-white shadow-sm">
                                        <button
                                            onClick={() =>
                                                onUpdateQuantity(
                                                    item.cart_key,
                                                    item.quantity - 1
                                                )
                                            }
                                            disabled={item.quantity <= 1}
                                            className="w-8 h-8 text-lg font-bold text-gray-600 hover:text-black disabled:opacity-30"
                                        >
                                            −
                                        </button>

                                        <span className="w-8 text-center font-semibold">
                                            {item.quantity}
                                        </span>

                                        <button
                                            onClick={() =>
                                                onUpdateQuantity(
                                                    item.cart_key,
                                                    item.quantity + 1
                                                )
                                            }
                                            className="w-8 h-8 text-lg font-bold text-gray-600 hover:text-black"
                                        >
                                            +
                                        </button>
                                    </div>
                                )}

                                {/* Price */}
                                <p className="font-semibold text-base text-gray-900 min-w-[80px] text-right">
                                    ₹{(
                                        item.total_price -
                                        (item.tax_details?.total_tax || 0) *
                                            item.quantity
                                    ).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Section */}
            <div className="mt-5 pt-4 border-t border-gray-200">

                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                    <span>Subtotal</span>
                    <span>₹{(subtotal - totalTax).toFixed(2)}</span>
                </div>

                {/* Tax Breakdown */}
                {Object.keys(taxBreakdown).length > 0 &&
                    Object.entries(taxBreakdown).map(([taxName, taxData]) => (
                        <div
                            key={taxName}
                            className="flex justify-between items-center text-sm text-gray-600 mb-2"
                        >
                            <span>
                                {taxName} ({taxData.percentage}%)
                            </span>
                            <span>₹{taxData.amount.toFixed(2)}</span>
                        </div>
                    ))}

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-bold mt-3 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                        ₹{subtotal.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Footer Note */}
            <p className="mt-3 text-xs text-gray-500 text-center">
                Happy eating! 🍽️
            </p>
        </div>
    );

}
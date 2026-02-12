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
                    Your Cart <span className="text-gray-500 font-medium">({totalItems} items)</span>
                </h3>
                {onEmptyCart && cart.length > 0 && (
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to empty your cart? This action cannot be undone.')) {
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
                        className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:shadow-sm transition"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-base">{item.name}</p>

                                {item.selected_variation && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {item.selected_variation.variation_name} • +₹{item.selected_variation.variation_price}
                                    </p>
                                )}

                                {item.addons.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Add-ons: {item.addons.map(a => `${a.addon_name}`).join(', ')}
                                    </p>
                                )}


                                {/* Qty Controls */}
                                {onUpdateQuantity && (
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center bg-white border rounded-full shadow-sm">
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

                                            <span className="w-8 text-center font-semibold">{item.quantity}</span>

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

                                        {onRemoveItem && (
                                            <button
                                                onClick={() =>
                                                    onRemoveItem(item.cart_key)
                                                }
                                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-4 h-4"
                                                >
                                                    <path d="M13 0h-2a3 3 0 00-3 3v1H2a1 1 0 000 2h1v14a4 4 0 004 4h10a4 4 0 004-4V6h1a1 1 0 000-2h-6V3a3 3 0 00-3-3zM10 3a1 1 0 011-1h2a1 1 0 011 1v1h-4V3zm9 17a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14v14z" />
                                                    <path d="M12 9a1 1 0 00-1 1v8a1 1 0 002 0v-8a1 1 0 00-1-1z" />
                                                    <path d="M15 18a1 1 0 002 0v-8a1 1 0 00-2 0v8z" />
                                                    <path d="M8 9a1 1 0 00-1 1v8a1 1 0 002 0v-8a1 1 0 00-1-1z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Price */}
                            <p className="font-semibold text-base text-gray-900">
                                ₹{(
                                    item.total_price -
                                    (item.tax_details?.total_tax || 0) * item.quantity
                                ).toFixed(2)}
                            </p>
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
                {Object.keys(taxBreakdown).length > 0 && (
                    <>
                        {Object.entries(taxBreakdown).map(([taxName, taxData]) => (
                            <div key={taxName} className="flex justify-between items-center text-sm text-gray-600 mb-2">
                                <span>{taxName} ({taxData.percentage}%)</span>
                                <span>₹{taxData.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </>
                )}

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-bold mt-3 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">₹{subtotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer Note */}
            <p className="mt-3 text-xs text-gray-500 text-center">
                Happy eating! 🍽️
            </p>
        </div>
    );
}
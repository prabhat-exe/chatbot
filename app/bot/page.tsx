"use client";

import "./bot.css";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { useChat } from "@/hooks/useChat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatInput from "@/components/chat/ChatInput";
import CartSummary from "@/components/CartSummary";
import { MenuItem, OrderItem } from "@/types";

export default function FoodBot() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const { messages, isLoading, sendMessage, addAssistantMessage, messagesEndRef } = useChat();
  const [showCart, setShowCart] = useState(false);

  // Handle ESC key to go back to chat
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
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
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (cart.length > 0 || messages.length > 1) { // messages.length > 1 to exclude the welcome message
        event.preventDefault();
        event.returnValue = 'You will lose your conversation and items in cart. Are you sure you want to leave?';
        return 'You will lose your conversation and items in cart. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart.length, messages.length]);

  const handleCategoryClick = (categoryName: string) => {
    const userText = `Show me ${categoryName}`;
    sendMessage(userText);
  };

  const handleItemClick = (item: MenuItem) => {
    addAssistantMessage({
      text: "",
      component: "customization",
      selectedItem: item,
    });
  };

  const handleAddToCart = async (orderItem: OrderItem) => {
    await addToCart(orderItem);
    sendMessage(`Added ${orderItem.name} ${orderItem.selected_variation?.variation_name ?? ""} x${orderItem.quantity} to cart`);
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
              ← Back
            </button>
          ) : (
            <button
              onClick={() => setShowCart(!showCart)}
              className="cart-button"
            >
              🛒 Cart {getTotalItems() > 0 && `(${getTotalItems()})`}
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
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onClose={() => {
                  setShowCart(false);
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                onEmptyCart={clearCart}
              />
            </div>
          ) : (
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
              onItemClick={handleItemClick}
              onAddToCart={handleAddToCart}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

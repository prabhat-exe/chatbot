"use client";

import "./bot.css";
import { useState, useEffect } from "react";
import { useCart } from "../../hooks/useCart";
import { useChat } from "../../hooks/useChat";
import ChatContainer from "../../components/chat/ChatContainer";
import ChatInput from "../../components/chat/ChatInput";
import CartSummary from "../../components/CartSummary";

export default function FoodBot() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const { messages, isLoading, sendMessage, addAssistantMessage, messagesEndRef } = useChat();
  const [showCart, setShowCart] = useState(false);
  const [cartGlow, setCartGlow] = useState(false);
  const [cartButtonRef, setCartButtonRef] = useState(null);
  const [floatingItem, setFloatingItem] = useState(null);

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

  const handleCategoryClick = (categoryName) => {
    const userText = `Show me ${categoryName}`;
    sendMessage(userText);
  };

  const handleItemClick = (item) => {
    addAssistantMessage({
      text: "",
      component: "customization",
      selectedItem: item,
    });
  };

  const handleAddToCart = async (orderItem, buttonRect) => {
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
              Go Back
            </button>
          ) : (
            <button
              ref={setCartButtonRef}
              onClick={() => setShowCart(!showCart)}
              className={`cart-button ${cartGlow ? 'cart-glow' : ''}`}
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
    </div>
  );
}

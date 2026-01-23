"use client";

import "./bot.css";
import { useCart } from "@/hooks/useCart";
import { useChat } from "@/hooks/useChat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatInput from "@/components/chat/ChatInput";
import { MenuItem, OrderItem } from "@/types";

export default function FoodBot() {
  const { addToCart } = useCart();
  const { messages, isLoading, sendMessage, addAssistantMessage, messagesEndRef } = useChat();

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

  const handleAddToCart = (orderItem: OrderItem) => {
    addToCart(orderItem);
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
          <h1>AI Food Bot</h1>
          <p>Chat to customize & order</p>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="food-bot-main">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onCategoryClick={handleCategoryClick}
          onItemClick={handleItemClick}
          onAddToCart={handleAddToCart}
          messagesEndRef={messagesEndRef}
        />
      </main>

      {/* Bottom Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

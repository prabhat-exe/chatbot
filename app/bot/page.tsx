"use client";

import { useState, useRef, useEffect } from "react";
import "./bot.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  menuData?: MenuData;
  component?: "menu-cards" | "customization" | "cart-confirm" | "delivery-options" | "time-selection" | "payment-options" | "order-confirmed";
}

interface MenuItem {
  item_id: number;
  name: string;
  price: number;
  image: string;
  is_chef_special: boolean;
  is_customizable?: boolean;
  description?: string;
}

interface MenuData {
  category_data: Array<{
    category_id: number;
    name: string;
    sub_category_data: Array<{
      menu_id: number;
      name: string;
      item_data: MenuItem[];
    }>;
  }>;
}

// Helper function to get all items from menu data
const getItemsFromMenuData = (menuData: MenuData): MenuItem[] => {
  const items: MenuItem[] = [];
  menuData.category_data.forEach(category => {
    category.sub_category_data.forEach(subCategory => {
      subCategory.item_data.forEach(item => {
        items.push({
          ...item,
          is_customizable: true // All items are customizable
        });
      });
    });
  });
  return items;
};

export default function FoodBot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi 👋 I'm your AI food assistant!\n\nYou can:\n• Browse the menu\n• Say 'Show me burgers' or 'vegetarian options'\n• Try: 'I want a large burger with extra cheese'\n\nWhat are you craving?",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Order flow state
  const [showMenuCards, setShowMenuCards] = useState(false);



  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message.trim();
    setMessage("");
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: userText
      }
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      const data = await res.json();

      const hasMenuData = data.intent === "SHOW_MENU" && data.category_data?.length;

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply,
          menuData: hasMenuData ? { category_data: data.category_data } : undefined
        }
      ]);

      // Hide sample menu cards when API returns menu data
      if (hasMenuData) {
        setShowMenuCards(false);
      }

      // Check if user provided address for delivery
      if (userText.toLowerCase().includes("sector") || userText.toLowerCase().includes("address") || userText.toLowerCase().includes("noida")) {

      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Sorry, something went wrong."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = message.trim() === "" || isLoading;

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
        <div className="chat-container">
          {/* Messages */}
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`message-wrapper ${msg.role}`}>
                <div className={`message-bubble ${msg.role}`}>
                  <div className="message-text">{msg.text}</div>
                </div>
              </div>

              {/* Render API Menu Items as Cards */}
              {msg.menuData && (
                <div className="menu-section">
                  <p className="menu-label">Here are some items for you:</p>
                  <div className="menu-cards-grid">
                    {getItemsFromMenuData(msg.menuData).map(item => (
                      <div
                        key={item.item_id}
                        className="menu-card"
                      >
                        <div className="menu-card-image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="menu-card-content">
                          <div className="menu-card-header">
                            <h4>{item.name}</h4>
                            <span className="menu-card-price">₹{item.price.toFixed(2)}</span>
                          </div>
                          <p className="menu-card-description">Freshly prepared with premium ingredients</p>
                          <div className="menu-card-badges">
                            {item.is_chef_special && (
                              <span className="badge hot">🔥 Hot</span>
                            )}
                            <span className="badge customizable">✨ Customizable</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="message-wrapper assistant">
              <div className="message-bubble assistant">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Sample Menu Cards Grid - shown initially */}
          {showMenuCards && (
            <div className="menu-section">
              <p className="menu-label">Type "show menu" to see our items!</p>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input */}
      <div className="food-bot-input-bar">
        <div className="input-container">
          <input
            id="user-input"
            className="user-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isDisabled && sendMessage()}
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            disabled={isDisabled}
            className={`send-btn ${isDisabled ? 'disabled' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

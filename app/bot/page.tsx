"use client";

import { useState, useRef, useEffect } from "react";
import "./bot.css";
import { getChat } from "../../lib/network/service";

interface CategoryItem {
  category_name: string;
  item_count: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  menuData?: MenuData;
  categories?: CategoryItem[];
  component?: "menu-cards" | "customization" | "cart-confirm" | "delivery-options" | "time-selection" | "payment-options" | "order-confirmed";
}

interface Variation {
  variation_id: number;
  variation_name: string;
  variation_price: string;
}

interface MenuItem {
  item_id: number;
  name: string;
  price: number;
  image: string;
  is_chef_special: boolean;
  is_customizable?: boolean;
  description?: string;
  variation_status: number;
  variations: Variation[];
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
      text: "Hi  I'm your AI food assistant!\n\nYou can:\n• Browse the menu\n• Say 'Show me burgers' or 'vegetarian options'\n• Try: 'I want a large burger with extra cheese'\n\nWhat are you craving?",
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
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Generate unique ID helper
  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const sendChatMessageToAPI = async (userText: string) => {
    setIsLoading(true);

    try {
      const response = await getChat(userText);
      const apiData = response.data;

      // Transform products into menu format like in route.ts
      const products = apiData?.data?.products || [];
      const categoryMap: any = {};

      products.forEach((p: any) => {
        if (!categoryMap[p.category_id]) {
          categoryMap[p.category_id] = {
            category_id: p.category_id,
            name: p.category,
            sub_category_data: [
              {
                menu_id: p.category_id,
                name: p.category,
                item_data: []
              }
            ]
          };
        }

        categoryMap[p.category_id].sub_category_data[0].item_data.push({
          item_id: p.product_id,
          name: p.product_name,
          price: p.price,
          image: p.image_url,
          is_chef_special: p.is_chef_special,
          variation_status: p.variation_status || 0,
          variations: p.variations || []
        });
      });

      const hasMenuData = apiData.intent === "SHOW_MENU" && Object.keys(categoryMap).length;
      const hasCategories = apiData.categories?.length;

      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: apiData.response,
          menuData: hasMenuData ? { category_data: Object.values(categoryMap) } : undefined,
          categories: hasCategories ? apiData.categories : undefined
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: "Sorry, something went wrong."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle item click - show selection message and variations
  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);

    const userText = `I want ${item.name} for ₹${item.price}`;

    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        text: userText
      }
    ]);
    sendChatMessageToAPI(userText);
  };

  // Handle variation selection
  const handleVariationClick = (item: MenuItem, variation: Variation) => {
    const userText = `I want ${item.name} ${variation.variation_name} for ₹${variation.variation_price}`;

    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        text: userText
      }
    ]);

    sendChatMessageToAPI(userText);

    setSelectedItem(null);
  };



  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message.trim();
    setMessage("");
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
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
      console.log('niche wla hai ',data)
      const hasMenuData = data.intent === "SHOW_MENU" && data.category_data?.length;
      const hasCategories = data.categories?.length;

      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: data.reply,
          menuData: hasMenuData ? { category_data: data.category_data } : undefined,
          categories: hasCategories ? data.categories : undefined
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
          id: generateId(),
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
              {msg.categories && (
                <div className="menu-section">
                  <p className="menu-label">Choose a category:</p>

                  <div className="menu-cards-grid">
                    {msg.categories.map(cat => (
                      <div
                        key={cat.category_name}
                        className="menu-card category-card"
                        onClick={() => {
                          const userText = `Show me ${cat.category_name}`;
                          setMessages(prev => [
                            ...prev,
                            {
                              id: generateId(),
                              role: "user",
                              text: userText
                            }
                          ]);
                          sendChatMessageToAPI(userText);
                        }}
                      >
                        <div className="menu-card-content">
                          <h4>{cat.category_name}</h4>
                          <p>{cat.item_count} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render API Menu Items as Cards */}
              {msg.menuData && (
                <div className="menu-section">
                  <p className="menu-label">Here are some items for you (tap a size to select):</p>
                  <div className="menu-cards-grid">
                    {getItemsFromMenuData(msg.menuData).map(item => (
                      <div
                        key={item.item_id}
                        className="menu-card"
                      >
                        <div className="menu-card-image">
                          <img
                            src={item.image || "/images/no_preview.png"}
                            alt={item.name}
                            className={`menu-image ${!item.image ? "default-image" : ""}`}
                            onError={(e) => {
                              e.currentTarget.src = "/images/no_preview.png";
                            }}
                          />
                        </div>
                        <div className="menu-card-content">
                          <div className="menu-card-header">
                            <h4>{item.name}</h4>
                            {item.is_chef_special && (
                              <span className="badge hot">🔥</span>
                            )}
                          </div>
                          <p className="menu-card-description">Freshly prepared with premium ingredients</p>

                          {/* Show variations directly in the card */}
                          {item.variation_status === 1 && item.variations && item.variations.length > 0 ? (
                            <div className="item-variations">
                              <p className="variations-title">Choose size:</p>
                              <div className="variations-buttons">
                                {item.variations.map(v => (
                                  <button
                                    key={v.variation_id}
                                    className="variation-btn-inline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVariationClick(item, v);
                                    }}
                                  >
                                    <span className="var-name">{v.variation_name}</span>
                                    <span className="var-price">₹{v.variation_price}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : item.price > 0 ? (
                            <div className="item-price-section">
                              <button
                                className="add-item-btn"
                                onClick={() => handleItemClick(item)}
                              >
                                Add to Order - ₹{item.price.toFixed(2)}
                              </button>
                            </div>
                          ) : (
                            <div className="item-price-section">
                              <button
                                className="add-item-btn"
                                onClick={() => handleItemClick(item)}
                              >
                                Select Item
                              </button>
                            </div>
                          )}
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

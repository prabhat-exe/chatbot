"use client";

import { useState, useRef, useEffect } from "react";
import "./bot.css";
import CustomizationCard from "@/components/CustomizationCard";


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
  component?:
    | "menu-cards"
    | "customization"
    | "cart-confirm"
    | "delivery-options"
    | "time-selection"
    | "payment-options"
    | "order-confirmed";
  selectedItem?: MenuItem;
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
  menuData.category_data.forEach((category) => {
    category.sub_category_data.forEach((subCategory) => {
      subCategory.item_data.forEach((item) => {
        items.push({
          ...item,
          is_customizable: true, // All items are customizable
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
    },
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

  // Handle item click - show selection message and variations
  const handleItemClick = (item: MenuItem) => {
    // User message
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        text: ``,
        component: "customization",
        selectedItem: item,
      },
    ]);
  };

  // Handle variation selection
  const handleVariationClick = (item: MenuItem, variation: Variation) => {
    const userText = `I want ${item.name} ${variation.variation_name} for ₹${variation.variation_price}`;

    sendMessage(userText);

    setSelectedItem(null);
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text: userText },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const apiData = await res.json();
      // console.log("API Data:", apiData);
      const hasMenuData = apiData.category_data?.length > 0;

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: apiData.reply,
          menuData: hasMenuData
            ? { category_data: apiData.category_data }
            : undefined,
          categories: apiData.categories?.length
            ? apiData.categories
            : undefined,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: "Sorry, something went wrong.",
        },
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
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.text && (
                <div className={`message-wrapper ${msg.role}`}>
                  <div className={`message-bubble ${msg.role}`}>
                    <div className="message-text">{msg.text}</div>
                  </div>
                </div>
              )}
              {msg.categories && (
                <div className="menu-section">
                  <p className="menu-label">Choose a category:</p>

                  <div className="menu-cards-grid">
                    {msg.categories.map((cat) => (
                      <div
                        key={cat.category_name}
                        className="menu-card category-card"
                        onClick={() => {
                          const userText = `Show me ${cat.category_name}`;
                          sendMessage(userText);
                        }}
                      >
                        <div className="menu-card-content">
                          <h4 className="text-[#1e3a8a] group-hover:text-[#1e3a8a]">
                            {cat.category_name}
                          </h4>
                          <p className="text-[#1e3a8a]">
                            {cat.item_count} items
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.component === "customization" && msg.selectedItem && (
                <CustomizationCard
                  item={msg.selectedItem}
                />
              )}

              {/* Render API Menu Items as Cards */}
              {msg.menuData && (
                <div className="menu-section">
                  <p className="menu-label">
                    Here are some items for you (tap a size to select):
                  </p>
                  <div className="menu-cards-grid">
                    {getItemsFromMenuData(msg.menuData).map((item) => (
                      <div
                        key={item.item_id}
                        onClick={(e) => handleItemClick(item)}
                        className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-95 "
                      >
                        <div className="flex gap-3 p-3">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <img
                              src={item.image || "/images/no_preview.png"}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-sm text-gray-900 truncate">
                                {item.name}
                              </h3>
                              {item.price > 0 && (
                                <span className="font-bold text-blue-900 text-sm whitespace-nowrap">
                                  ₹{item.price}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                              Freshly prepared with premium ingredients
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.is_chef_special && (
                                <span
                                  data-slot="badge"
                                  className="inline-flex items-center justify-center rounded-md font-medium w-fit whitespace-nowrap shrink-0 [&amp;&gt;svg]:size-3 gap-1 [&amp;&gt;svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&amp;]:hover:bg-primary/90 bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-flame w-2.5 h-2.5 mr-0.5"
                                  >
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                                  </svg>
                                  Chef special
                                </span>
                              )}
                              {item.variation_status === 1 &&
                                item.variations && (
                                  <span
                                    data-slot="badge"
                                    className="inline-flex items-center justify-center rounded-md font-medium w-fit whitespace-nowrap shrink-0 [&amp;&gt;svg]:size-3 gap-1 [&amp;&gt;svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&amp;]:hover:bg-primary/90 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5"
                                  >
                                    🎨 Customizable
                                  </span>
                                )}
                            </div>
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDisabled) {
                sendMessage(message);
                setMessage("");
              }
            }}
            placeholder="Type your message..."
          />
          <button
            onClick={() => {
              if (!isDisabled) {
                sendMessage(message);
                setMessage("");
              }
            }}
            disabled={isDisabled}
            className={`send-btn ${isDisabled ? "disabled" : ""}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../utils/api";

export function useChat() {
  const initialMessage = {
    id: "welcome",
    role: "assistant",
    text: "Hi, I'm your AI food assistant!\n\nChoose how you'd like to order:",
    actions: [
      { id: "start-same-day-order", label: "Same Day Order", type: "start_same_day_order" },
      { id: "start-meal-prep-order", label: "Meal Preparation & Order", type: "start_meal_plan_order" },
    ],
  };
  const [messages, setMessages] = useState([
    initialMessage,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Generate unique ID helper
  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const sendMessage = async (userText, restaurantId) => {
    if (!userText.trim()) return;
    if (!restaurantId) return;

    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text: userText },
    ]);

    try {
      const apiData = await sendChatMessage(userText, restaurantId);
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
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addAssistantMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        ...message,
      },
    ]);
  };

  const addUserMessage = (text) => {
    if (!text?.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text: text.trim() },
    ]);
  };

  const resetChat = () => {
    setMessages([initialMessage]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    addAssistantMessage,
    addUserMessage,
    messagesEndRef,
    resetChat,
  };
}

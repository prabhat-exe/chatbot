import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../utils/api";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
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

    setLoadingMessage("");
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
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    loadingMessage,
    setLoadingMessage,
    setIsLoading,
    sendMessage,
    addAssistantMessage,
    addUserMessage,
    messagesEndRef,
    resetChat,
  };
}

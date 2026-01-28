import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../utils/api";

export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi  I'm your AI food assistant!\n\nYou can:\n• Browse the menu\n• Say 'Show me burgers' or 'vegetarian options'\n• Try: 'I want a large burger with extra cheese'\n\nWhat are you craving?",
    },
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

  const sendMessage = async (userText) => {
    if (!userText.trim()) return;

    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text: userText },
    ]);

    try {
      const apiData = await sendChatMessage(userText);
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

  return {
    messages,
    isLoading,
    sendMessage,
    addAssistantMessage,
    messagesEndRef,
  };
}
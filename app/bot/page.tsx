"use client";

import { useState } from "react";
import Image from "next/image";
import "./bot.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  menuData?: MenuData; // OPTIONAL
}


interface MenuItem {
  item_id: number;
  name: string;
  price: number;
  image: string;
  is_chef_special: boolean;
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

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuData, setMenuData] = useState<MenuData | null>(null);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message.trim();
    setMessage("");
    setIsLoading(true);

    // 1️⃣ push user message
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

      // 2️⃣ push assistant message
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply,
          menuData:
            data.intent === "SHOW_MENU" &&
            data.category_data?.length
              ? { category_data: data.category_data }
              : undefined
        }
      ]);
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
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">

      {/* Header */}
      <header className="flex items-center gap-3 header bg-white px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c398e] text-white">
          🤖
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#1c398e]">AI Food Bot</h1>
          <p className="text-sm text-zinc-500">
            Chat to customize & order
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          {/* Messages */}
          <div className="space-y-4 item-menu">
            {messages.map(msg => (
              <div key={msg.id}>
                {/* TEXT BUBBLE */}
                <div
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-[#1c398e] text-white"
                        : "bg-white text-zinc-900 shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* ITEMS (ONLY IF PRESENT) */}
                {msg.menuData && (
                  <div className="mt-4 space-y-4">
                    {msg.menuData.category_data.map(category => (
                      <div
                        key={category.category_id}
                        className="rounded-xl bg-white p-4 shadow-sm"
                      >
                        <h3 className="text-lg font-semibold mb-3">
                          {category.name}
                        </h3>

                        {category.sub_category_data.map(sub => (
                          <div key={sub.menu_id} className="grid gap-3">
                            {sub.item_data.map(item => (
                              <div
                                key={item.item_id}
                                className="flex gap-4 rounded-lg border p-4"
                              >
                                <img
                                  src={item.image}
                                  className="h-20 w-20 rounded-lg object-cover"
                                />

                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <h4 className="font-semibold">
                                      {item.name}
                                    </h4>
                                    <span className="font-semibold text-blue-600">
                                      ₹{item.price}
                                    </span>
                                  </div>

                                  {item.is_chef_special && (
                                    <span className="mt-2 inline-block rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">
                                      ⭐ Chef Special
                                    </span>
                                  )}
                                </div>

                                <button className="rounded border px-3 text-sm text-blue-600">
                                  ADD
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>


          {/* Menu Display */}
          {menuData && (
            <div className="mt-6 space-y-4">
              {menuData.category_data.map(category => (
                <div key={category.category_id} className="rounded-xl bg-white p-4 shadow-sm item-menu">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-3">{category.name}</h3>
                  {category.sub_category_data.map(subCategory => (
                    <div key={subCategory.menu_id} className="mb-4">
                      <h4 className="text-md font-medium text-zinc-700 mb-2">{subCategory.name}</h4>
                      <div className="grid gap-3">
                        {subCategory.item_data.map(item => (
                            <div
                              key={item.item_id}
                              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border"
                            >
                              {/* Item Image */}
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-20 w-20 rounded-lg object-cover"
                              />

                              {/* Item Info */}
                              <div className="flex flex-1 flex-col">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-base font-semibold text-zinc-900">
                                        {item.name}
                                      </h5>

                                    </div>

                                    <p className="mt-1 text-sm text-zinc-500">
                                      Freshly prepared with premium ingredients
                                    </p>
                                  </div>

                                  {/* Price */}
                                  <div className="text-base font-semibold text-blue-600">
                                    ₹{item.price}
                                  </div>
                                </div>

                                {/* Badges */}
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                                    🔥 250 kcal
                                  </span>

                                  {item.is_chef_special && (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                                      ⭐ Chef Special
                                    </span>
                                  )}

                                </div>
                              </div>

                              {/* Add Button */}
                              <button className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                                ADD
                              </button>
                            </div>
                          ))}

                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 shadow-top">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input
            id="user-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isDisabled && sendMessage()}
            placeholder="Try: Large burger with bacon..."
            className="flex-1 rounded-full bg-zinc-100 px-4 py-3 text-sm outline-none
                       focus:ring-2 focus:ring-[#7c7c83]"
          />

          <button
            onClick={sendMessage}
            disabled={isDisabled}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white
              ${isDisabled
                ? "bg-zinc-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            ➤
          </button>
        </div>
      </div>

    </div>
  );
}

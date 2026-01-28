"use client";

import { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (!disabled && message.trim()) {
            onSend(message);
            setMessage("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !disabled) {
            handleSend();
        }
    };

    return (
        <div className="food-bot-input-bar">
            <div className="input-container">
                <input
                    id="user-input"
                    className="user-input"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={disabled}
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || !message.trim()}
                    className={`send-btn ${disabled || !message.trim() ? "disabled" : ""}`}
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
    );
}
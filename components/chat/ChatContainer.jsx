"use client";

import MessageBubble from "../ui/MessageBubble";
import MenuCard from "../ui/MenuCard";
import CustomizationCard from "../CustomizationCard";
import { getItemsFromMenuData } from "../../utils/helpers";

export default function ChatContainer({
    messages,
    isLoading,
    onItemClick,
    onAddToCart,
    onMessageAction,
    messagesEndRef,
}) {
    return (
        <div className="chat-container">
            {messages.map((msg) => (
                <div key={msg.id}>
                    <MessageBubble message={msg} onAction={onMessageAction} />

                    {msg.component === "customization" && msg.selectedItem && (
                        <CustomizationCard
                            item={msg.selectedItem}
                            onAddToCart={onAddToCart}
                        />
                    )}

                    {msg.menuData && (
                        <div className="menu-section">
                            <p className="menu-label">Suggested items:</p>
                            <div className="menu-cards-grid">
                                {getItemsFromMenuData(msg.menuData).map((item) => (
                                    <MenuCard
                                        key={item.item_id}
                                        item={item}
                                        onClick={onItemClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

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

            <div ref={messagesEndRef} />
        </div>
    );
}

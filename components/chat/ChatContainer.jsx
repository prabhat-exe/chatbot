"use client";

import MessageBubble from "../ui/MessageBubble";
import MenuCard from "../ui/MenuCard";
import CustomizationCard from "../CustomizationCard";
import MealPlanSchedule from "./MealPlanSchedule";
import { getItemsFromMenuData } from "../../utils/helpers";

export default function ChatContainer({
    messages,
    currencySymbol = "₹",
    isLoading,
    loadingMessage,
    onItemClick,
    onAddToCart,
    onMessageAction,
    messagesEndRef,
}) {
    return (
        <div className="chat-container">
            {messages.map((msg) => (
                <div key={msg.id}>
                    {!msg.mealPlan && <MessageBubble message={msg} onAction={onMessageAction} />}

                    {msg.component === "customization" && msg.selectedItem && (
                        <CustomizationCard
                            item={msg.selectedItem}
                            onAddToCart={onAddToCart}
                            currencySymbol={currencySymbol}
                        />
                    )}

                    {msg.mealPlan && (
                        <MealPlanSchedule
                            mealPlan={msg.mealPlan}
                            products={msg.mealPlanProducts || []}
                            currencySymbol={currencySymbol}
                        />
                    )}

                    {msg.mealPlan && <MessageBubble message={msg} onAction={onMessageAction} />}

                    {msg.menuData && !msg.mealPlan && (
                        <div className="menu-section">
                            <p className="menu-label">Suggested items:</p>
                            <div className="menu-cards-grid">
                                {getItemsFromMenuData(msg.menuData).map((item, index) => (
                                    <MenuCard
                                        key={`${msg.id}-${item.item_id ?? item.name ?? "item"}-${index}`}
                                        item={item}
                                        onClick={onItemClick}
                                        currencySymbol={currencySymbol}
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
                        {loadingMessage && <div className="message-text">{loadingMessage}</div>}
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

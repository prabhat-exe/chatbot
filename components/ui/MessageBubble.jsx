const includesActionValue = (selectedValue, actionValue) => {
    const selectedList = Array.isArray(selectedValue)
        ? selectedValue
        : selectedValue
            ? [selectedValue]
            : [];

    return selectedList.some((value) => String(value) === String(actionValue));
};

export default function MessageBubble({ message, onAction, mealPlanAnswers = {} }) {
    if (!message.text) return null;

    return (
        <div className={`message-wrapper ${message.role}`}>
            <div className={`message-bubble ${message.role}`}>
                <div className="message-text">{message.text}</div>
                {message.role === "assistant" && Array.isArray(message.actions) && message.actions.length > 0 && (
                    <div className="message-actions">
                        {message.actions.map((action) => {
                            const isSelected =
                                action.type === "meal_plan_toggle_multi_question" &&
                                includesActionValue(mealPlanAnswers?.[action.questionKey], action.value);

                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    className={`message-action-btn${isSelected ? " is-selected" : ""}`}
                                    aria-pressed={action.type === "meal_plan_toggle_multi_question" ? isSelected : undefined}
                                    onClick={() => onAction?.(action)}
                                >
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

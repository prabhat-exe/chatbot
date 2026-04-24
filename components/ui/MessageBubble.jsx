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

    const actions = Array.isArray(message.actions) ? message.actions : [];
    const optionActions = actions.filter((action) => action.type !== "meal_plan_continue_multi_question");
    const continueActions = actions.filter((action) => action.type === "meal_plan_continue_multi_question");

    const renderActionButton = (action) => {
        const isSelected =
            action.type === "meal_plan_toggle_multi_question" &&
            includesActionValue(mealPlanAnswers?.[action.questionKey], action.value);
        const isContinue = action.type === "meal_plan_continue_multi_question";

        return (
            <button
                key={action.id}
                type="button"
                className={`message-action-btn${isSelected ? " is-selected" : ""}${isContinue ? " is-continue" : ""}`}
                aria-pressed={action.type === "meal_plan_toggle_multi_question" ? isSelected : undefined}
                onClick={() => onAction?.(action)}
            >
                {action.label}
            </button>
        );
    };

    return (
        <div className={`message-wrapper ${message.role}`}>
            <div className={`message-bubble ${message.role}`}>
                <div className="message-text">{message.text}</div>
                {message.role === "assistant" && actions.length > 0 && (
                    <div className="message-actions">
                        {optionActions.length > 0 && (
                            <div className="message-option-actions">
                                {optionActions.map(renderActionButton)}
                            </div>
                        )}
                        {continueActions.length > 0 && (
                            <div className="message-continue-actions">
                                {continueActions.map(renderActionButton)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

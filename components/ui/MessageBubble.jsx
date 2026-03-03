export default function MessageBubble({ message, onAction }) {
    if (!message.text) return null;

    return (
        <div className={`message-wrapper ${message.role}`}>
            <div className={`message-bubble ${message.role}`}>
                <div className="message-text">{message.text}</div>
                {message.role === "assistant" && Array.isArray(message.actions) && message.actions.length > 0 && (
                    <div className="message-actions">
                        {message.actions.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                className="message-action-btn"
                                onClick={() => onAction?.(action)}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
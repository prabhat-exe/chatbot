import { ChatMessage } from "@/types";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  if (!message.text) return null;

  return (
    <div className={`message-wrapper ${message.role}`}>
      <div className={`message-bubble ${message.role}`}>
        <div className="message-text">{message.text}</div>
      </div>
    </div>
  );
}
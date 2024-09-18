import React, { useEffect } from "react";
import "./index.css";
import { Check } from "lucide-react";
import toast from "react-hot-toast";

const ContentBody = () => {
  const [messages, setMessages] = React.useState([]);
  const [copiedItemId, setCopiedItemId] = React.useState(null);

  const copyToClipboard = React.useCallback((text, itemId, title) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItemId(itemId);
      toast.success(`Copied ${title} to clipboard`, {
        duration: 3000,
        style: {
          background: "#333",
          color: "#fff",
        }
      });
    });
  }, []);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.button_messages) {
      const newMessages = changes.button_messages.newValue;
      setMessages(newMessages);
      toast.success("Button messages updated", {
        duration: 3000,
        icon: '📝',
        style: {
          background: "#333",
          color: "#fff",
        },
        id: "updated-messages"
      });
    }
  });

  React.useEffect(() => {
    chrome.storage.local.get("button_messages", (result) => {
      const messages = result.button_messages || [];
      setMessages(messages);
    });
  }, []);

  return (
    <div className="relative p-4 border rounded">
      {messages.map((category, index) => (
        <div className="relative" key={category.id}>
          <h2
            key={category.id}
            className="text-base text-gray-700 font-semibold"
            style={{ marginBottom: "10px" }}
          >
            {category.title}
          </h2>
          <div
            className="flex gap-4 flex-wrap"
            style={{ flexWrap: "wrap", gap: "6px" }}
          >
            {category.messages.map((msg, index) => (
              <button
                key={msg.id}
                className="border rounded px-4 py-2 text-[14px] font-semibold transition-all bg-neutral-100"
                style={{
                  color: copiedItemId === msg.id ? "#0b963e" : "#3a424a",
                  borderColor: copiedItemId === msg.id ? "#0b963e" : "#68717a",
                  backgroundColor: copiedItemId === msg.id? "#d3f5df" : "#f7f9fa",
                }}
                onClick={() => copyToClipboard(msg.message, msg.id, msg.title)}
              >
                {msg.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentBody;

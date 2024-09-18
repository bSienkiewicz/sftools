import React from "react";
import "./App.css";
import { v4 as uuidv4 } from "uuid";
import { Check, ChevronRight, Copy, Edit, Plus, Trash2 } from "lucide-react";
import EditMessageModal from "./EditMessageModal";

function App() {
  const [messages, setMessages] = React.useState([]);
  const [copiedItemId, setCopiedItemId] = React.useState(null);
  const [editingMessage, setEditingMessage] = React.useState(null);

  React.useEffect(() => {
    chrome.storage.local.get("button_messages", (result) => {
      // Ensure result.button_messages is an array or fallback to an empty array
      setMessages(result.button_messages || []);
    });
  }, []);

  React.useEffect(() => {
    console.log(messages);
  }, [messages]);

  const copyToClipboard = React.useCallback((text, itemId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItemId(itemId);
      setTimeout(() => setCopiedItemId(null), 2000);
    });
  }, []);

  const editMessage = (categoryId, messageId) => {
    setEditingMessage({ categoryId, messageId });
  };

  const addNewMessage = (categoryId) => {
    const newMessage = {
      title: "New message",
      message: "New message body",
      id: uuidv4(),
    };

    // Get the current categories from state
    setMessages((prevMessages) => {
      const updatedCategories = prevMessages.map((category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            messages: [...category.messages, newMessage],
          };
        }
        return category;
      });

      // Update local storage with the new categories array
      chrome.storage.local.set({ button_messages: updatedCategories }, () => {
        console.log("Message added to local storage");
      });

      return updatedCategories;
    });
  };

  const deleteMessage = (categoryId, messageId) => {
    setMessages((prevMessages) => {
      const updatedCategories = prevMessages.map((category) => {
        if (category.id === categoryId) {
          const updatedMessages = category.messages.filter(
            (message) => message.id !== messageId
          );

          return {
            ...category,
            messages: updatedMessages,
          };
        }
        return category;
      });

      chrome.storage.local.set({ button_messages: updatedCategories }, () => {
        console.log("Message deleted from local storage");
      });

      return updatedCategories;
    });
  };

  const saveEditedMessage = (categoryId, messageId, newTitle, newMessage) => {
    const updatedCategories = messages.map((category) => {
      if (category.id === categoryId) {
        return {
          ...category,
          messages: category.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, title: newTitle, message: newMessage }
              : msg
          ),
        };
      }
      return category;
    });

    setMessages(updatedCategories);

    chrome.storage.local.set({ button_messages: updatedCategories }, () => {
      console.log("Changes saved to local storage");
    });

    // Close the modal
    setEditingMessage(null);
  };

  return (
    <div className="w-96 h-[600px] flex flex-col relative">
      <h1 className="text-3xl font-bold text-center p-4">Parrot</h1>

      {/* Flexible container for the message list */}
      <div className="flex-grow overflow-auto space-y-6 relative p-8">
        {messages.map((category) => (
          <div key={category.id} className="mt-5 group">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold rounded text-gray-700">
                {category.title}
              </h2>
              <button
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                onClick={() => addNewMessage(category.id)}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Message list */}
            <ul className="space-y-2">
              {category.messages.map((msg, index) => (
                <li key={msg.id} className="group/item">
                  <div className="flex justify-between items-center">
                    <button
                      className="w-full text-left py-2 px-3 flex gap-5 items-center hover:bg-gray-100 transition-colors rounded"
                      onClick={() => copyToClipboard(msg.message, msg.id)}
                    >
                      <div className="bg-neutral-100 p-1 rounded">
                        {copiedItemId === msg.id ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} className="text-gray-400" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{msg.title}</span>
                    </button>

                    {/* Edit/Delete buttons */}
                    <div className="opacity-0 group-hover/item:opacity-100 flex space-x-1 ml-2">
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => editMessage(category.id, msg.id)}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Edit Message Modal */}
      {editingMessage && (
        <EditMessageModal
          messages={messages}
          categoryId={editingMessage.categoryId}
          messageId={editingMessage.messageId}
          onSave={saveEditedMessage}
          onClose={() => setEditingMessage(null)}
          onDelete={() => deleteMessage(editingMessage.categoryId, editingMessage.messageId)}
        />
      )}
    </div>
  );
}

export default App;

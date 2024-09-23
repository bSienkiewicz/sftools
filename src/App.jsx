import React from "react";
import "./App.css";
import { v4 as uuidv4 } from "uuid";
import {
  Check,
  ChevronRight,
  Copy,
  Edit,
  FileDown,
  GripVertical,
  Import,
  Move,
  Plus,
  Trash2,
} from "lucide-react";
import EditMessageModal from "./EditMessageModal";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import SortableItem from "./components/SortableItem";



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

  const handleExport = () => {
    const jsonString = JSON.stringify(messages);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date().toISOString().replace(/T|Z/g, "_").slice(0, -5);

    a.href = url;
    a.download = `nest_import_${now}.json`;
    a.click();
  };

  const handleImport = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonData = JSON.parse(e.target.result);
        setMessages(jsonData);
        chrome.storage.local.set({ button_messages: jsonData });
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

  const handleDragEnd = (event, categoryId) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setMessages((prevMessages) => {
        const updatedCategories = prevMessages.map((category) => {
          if (category.id === categoryId) {
            const oldIndex = category.messages.findIndex(
              (msg) => msg.id === active.id
            );
            const newIndex = category.messages.findIndex(
              (msg) => msg.id === over.id
            );

            const updatedMessages = arrayMove(
              category.messages,
              oldIndex,
              newIndex
            );
            return { ...category, messages: updatedMessages };
          }
          return category;
        });

        chrome.storage.local.set({ button_messages: updatedCategories });

        return updatedCategories;
      });
    }
  };

  return (
    <div className="w-96 h-[600px] flex flex-col relative">
      <h1 className="text-3xl font-bold text-center p-6 shadow">Parrot</h1>
      <div className="absolute top-0 right-0 p-2 w-full flex gap-2 items-center text-[8px] text-gray-400">
        <button onClick={handleImport}>Import</button>
        <span>/</span>
        <button onClick={handleExport}>Export</button>
      </div>

      <div className="flex-grow overflow-auto space-y-6 relative p-8">
        {messages.map((category) => (
          <div key={category.id} className="mt-5 group">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold rounded text-gray-700">
                {category.title}
              </h2>
              <button onClick={() => addNewMessage(category.id)}>
                <Plus size={14} />
              </button>
            </div>

            {/* Message list */}
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, category.id)}
            >
              <SortableContext
                items={category.messages.map((msg) => msg.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {category.messages.map((msg) => (
                    <SortableItem
                      key={msg.id}
                      id={msg.id}
                      message={msg}
                      copiedItemId={copiedItemId}
                      copyToClipboard={copyToClipboard}
                      editMessage={editMessage}
                      categoryId={category.id}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        ))}
      </div>

      {editingMessage && (
        <EditMessageModal
          messages={messages}
          categoryId={editingMessage.categoryId}
          messageId={editingMessage.messageId}
          onSave={saveEditedMessage}
          onClose={() => setEditingMessage(null)}
        />
      )}
    </div>
  );
}

export default App;

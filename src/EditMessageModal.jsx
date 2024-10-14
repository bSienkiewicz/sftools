import { ArrowLeft, Save, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";

const EditMessageModal = ({
  messages,
  categoryId,
  messageId,
  onSave,
  onClose,
  onDelete,
}) => {
  const [currentMessage, setCurrentMessage] = useState({
    title: "",
    message: "",
  });
  const [isVisible, setIsVisible] = useState(false); // State to control visibility

  // Get the current message when the component mounts
  useEffect(() => {
    const category = messages.find((category) => category.id === categoryId);
    const message = category?.messages.find((msg) => msg.id === messageId);
    if (message) {
      setCurrentMessage({ title: message.title, message: message.message });
    }

    // Start animation to show the modal
    setTimeout(() => {
      setIsVisible(true);
    }, 10); // Delay a little to trigger the animation
  }, [messages, categoryId, messageId]);

  const handleTitleChange = (e) => {
    setCurrentMessage((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleMessageChange = (e) => {
    setCurrentMessage((prev) => ({ ...prev, message: e.target.value }));
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    onSave(categoryId, messageId, currentMessage.title, currentMessage.message);
    handleClose(); // Close the modal after saving
  };

  const handleDelete = () => {
    onDelete(categoryId, messageId);
    handleClose(); // Close the modal after deleting
  };

  return (
    <div
      className={`w-full h-full bg-gray-50 text-gray-800 p-6 rounded-lg shadow-sm transition-all duration-300 absolute top-0 left-0 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors p-4"
          onClick={handleClose}
          aria-label="Go back"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="text-lg font-light tracking-wide">Edit Message</div>
        <div className="w-4"></div> {/* Spacer for alignment */}
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={currentMessage.title}
            onChange={handleTitleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Message
          </label>
          <textarea
            id="description"
            value={currentMessage.message}
            onChange={handleMessageChange}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
          </textarea>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save size={14} className="mr-2" />
            Save
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 size={14} className="mr-2" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMessageModal;

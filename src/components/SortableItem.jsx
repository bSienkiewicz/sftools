import React from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Edit, GripVertical } from "lucide-react";

function SortableItem({
  id,
  message,
  copiedItemId,
  copyToClipboard,
  editMessage,
  categoryId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  // Restrict movement to Y-axis
  const yAxisTransform = { ...transform, x: 0 };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="group/item">
      <div className="flex justify-between items-center hover:bg-gray-100 transition-colors rounded py-2 px-3 ">
        <button
          className="w-full text-left flex gap-5 items-center"
          onClick={() => editMessage(categoryId, message.id)}
        >
          <div
            className="cursor-grab p-1"
            {...listeners} // Apply listeners only to this div
            {...attributes}
          >
            <GripVertical size={16} className="text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">{message.title}</span>
        </button>

        {/* Only this div will be draggable */}
        <div className="flex items-center space-x-2">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Edit size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

export default SortableItem;

import React from "react";

/**
 * Presentational UI: list of template categories and buttons.
 */
export default function CommentTemplatesPanel({
  messages,
  showTextExpansionAlias,
  onFillFields,
  copiedItemId,
}) {
  return (
    <div className="relative p-4 border rounded">
      {messages.map((category) => (
        <div className="relative" key={category.id}>
          <h2
            className="text-base text-gray-700 font-semibold"
            style={{ marginBottom: "10px" }}
          >
            {category.title}
          </h2>
          <div
            className="flex gap-4 flex-wrap"
            style={{ flexWrap: "wrap", gap: "6px" }}
          >
            {(category.messages || []).map((msg) => (
              <button
                key={msg.id}
                type="button"
                className="border rounded px-4 py-2 text-[14px] font-semibold transition-all bg-neutral-100"
                style={{
                  color: copiedItemId === msg.id ? "#0b963e" : "#3a424a",
                  borderColor: copiedItemId === msg.id ? "#0b963e" : "#68717a",
                  backgroundColor:
                    copiedItemId === msg.id ? "#d3f5df" : "#f7f9fa",
                }}
                onClick={() => onFillFields(msg.message, msg.id, msg.title)}
              >
                <div className="flex flex-row gap-2">
                  <span className="text-sm text-gray-600">{msg.title}</span>
                  {msg.alias && showTextExpansionAlias && (
                    <span
                      className="text-gray-500"
                      style={{ alignSelf: "center", fontSize: "8px" }}
                    >
                      ;{msg.alias}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

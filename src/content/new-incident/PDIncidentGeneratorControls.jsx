import React from "react";

export default function PDIncidentGeneratorControls() {
  const [value, setValue] = React.useState("");

  const handleApply = (e) => {
    e.preventDefault();
    console.log("Apply:", value);
  };

  return (
    <form
      onSubmit={handleApply}
      className="sftools-incident-legend-actions"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px",
      }}
    >
      <input
        type="text"
        placeholder="PagerDuty incident URL"
        className="slds-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ minWidth: "360px" }}
      />
      <button
        type="submit"
        className="slds-button slds-button_brand"
      >
        Generate
      </button>
    </form>
  );
}

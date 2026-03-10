import React, { useState } from "react";
import { ValidationResult } from "../utils/validation-utils";

interface WarningBannerProps {
  validation: ValidationResult;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ validation }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || validation.warnings.length === 0) {
    return null;
  }

  const isSingle = validation.warnings.length === 1;

  return (
    <div
      id="sankey-warning-banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#fff3cd",
        border: "1px solid #ffeaa7",
        color: "#856404",
        padding: "10px 40px 10px 16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "13px",
        lineHeight: "1.4",
        zIndex: 1000,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          background: "none",
          border: "none",
          color: "#856404",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: "1",
          padding: "0 4px",
        }}
        aria-label="Dismiss warning"
      >
        ×
      </button>
      {isSingle ? (
        <span>{validation.warnings[0]}</span>
      ) : (
        <ul style={{ margin: "0", paddingLeft: "18px" }}>
          {validation.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

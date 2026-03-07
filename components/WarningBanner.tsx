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
        padding: "12px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",
        zIndex: 1000,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div>
        <strong>⚠️ Configuration Warning:</strong>{" "}
        {validation.warnings.join(" ")}
        <button
          onClick={() => setIsVisible(false)}
          style={{
            float: "right",
            background: "none",
            border: "none",
            color: "#856404",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

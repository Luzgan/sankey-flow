import React from "react";
import { ValidationResult } from "../utils/validation-utils";

interface ErrorStateProps {
  validation: ValidationResult;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ validation }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "#f8f9fa",
        color: "#333",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>

      <h2
        style={{
          margin: "0 0 20px 0",
          color: "#dc3545",
          fontWeight: "600",
        }}
      >
        Sankey Visualization Configuration Error
      </h2>

      <ul
        style={{
          textAlign: "left",
          margin: "0 0 20px 0",
          paddingLeft: "20px",
        }}
      >
        {validation.errors.map((error, index) => (
          <li
            key={index}
            style={{
              marginBottom: "8px",
              color: "#dc3545",
            }}
          >
            {error}
          </li>
        ))}
      </ul>

      {validation.warnings.length > 0 && (
        <ul
          style={{
            textAlign: "left",
            margin: "0 0 20px 0",
            paddingLeft: "20px",
          }}
        >
          {validation.warnings.map((warning, index) => (
            <li
              key={index}
              style={{
                marginBottom: "8px",
                color: "#ffc107",
              }}
            >
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          background: "#e9ecef",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "600px",
          textAlign: "left",
        }}
      >
        <h3 style={{ marginTop: "0", color: "#495057" }}>How to fix this:</h3>
        <ol style={{ margin: "0", paddingLeft: "20px" }}>
          <li>
            <strong>Add Level Fields:</strong> Drag 2-5 dimension fields to the
            "Level" shelf in the Marks card
          </li>
          <li>
            <strong>Add Edge Field:</strong> Drag exactly 1 measure field to the
            "Edge" shelf in the Marks card
          </li>
          <li>
            <strong>Ensure Data:</strong> Make sure your worksheet has data to
            visualize
          </li>
        </ol>
        <p style={{ margin: "15px 0 0 0", fontSize: "14px", color: "#6c757d" }}>
          The Sankey diagram shows flow between multiple levels (2-5 levels)
          with the edge representing the flow value.
        </p>
      </div>
    </div>
  );
};

import React from "react";

export const LoadingState: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        fontSize: "16px",
        color: "#666",
      }}
    >
      Loading Sankey Chart...
    </div>
  );
};

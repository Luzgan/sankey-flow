import React from "react";
import { createRoot } from "react-dom/client";
import { SankeyApp } from "./components/SankeyApp";

/**
 * Initialize the extension with React
 */
window.onload = () => {
  console.log("Extension loading...");

  tableau.extensions
    .initializeAsync()
    .then(async () => {
      console.log("Extension initialized successfully");

      // Get the worksheet that the Viz Extension is running in
      const worksheet = tableau.extensions.worksheetContent?.worksheet;
      if (!worksheet) throw new Error("Worksheet not found");

      // Read current Tableau formatting styles (workbook-level formatting)
      const getStyles = () =>
        tableau.extensions.environment.workbookFormatting?.formattingSheets?.find(
          (x: { classNameKey: string }) => x.classNameKey === "tableau-worksheet"
        )?.cssProperties;

      // Create React root and render the app
      const container = document.getElementById("content");
      if (!container) throw new Error("Content container not found");

      const root = createRoot(container);
      root.render(<SankeyApp worksheet={worksheet} getStyles={getStyles} />);
    })
    .catch((error) => {
      console.error("Extension initialization failed:", error);
    });
};

import React from "react";
import { createRoot } from "react-dom/client";
import { SankeyApp } from "./components/SankeyApp";

/**
 * Configuration function for Tableau context menu
 */
function configure() {
  // Derive config URL relative to the current page (works in both dev and production)
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
  const popupUrl = `${window.location.origin}${basePath}SankeyConfig.html`;

  if (
    typeof tableau !== "undefined" &&
    tableau.extensions &&
    tableau.extensions.ui
  ) {
    tableau.extensions.ui
      .displayDialogAsync(popupUrl, "", { height: 450, width: 550 })
      .then((closePayload) => {
        // Configuration was saved, settings will be updated via settings change event
        console.log("Configuration dialog closed with payload:", closePayload);
      })
      .catch((error) => {
        // Handle dialog close scenarios
        if (error.errorCode === tableau.ErrorCodes.DialogClosedByUser) {
          console.log("Configuration dialog was closed by user");
        } else {
          console.error("Error with configuration dialog:", error);
        }
      });
  }

  return {};
}

/**
 * Initialize the extension with React
 */
window.onload = () => {
  console.log("Extension loading...");

  // Initialize with configure callback for context menu
  tableau.extensions
    .initializeAsync({ configure: configure })
    .then(async () => {
      console.log("Extension initialized successfully with configure callback");
      console.log("Configure function registered:", typeof configure);

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

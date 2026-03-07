import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigurationApp } from "./components/ConfigurationApp";
import { TableauInit } from "./utils/tableau-api-utils";

/**
 * Initialize the configuration dialog with React
 */
window.onload = async () => {
  console.log('Configuration dialog loading...');
  
  const openPayload = await TableauInit.initializeDialog();
  if (openPayload !== null) {
    console.log('Configuration dialog initialized successfully');
    console.log('Open payload:', openPayload);

    // Create React root and render the configuration app
    const container = document.getElementById("config-content");
    if (!container) throw new Error("Config content container not found");

    const root = createRoot(container);
    root.render(<ConfigurationApp />);
  } else {
    console.error('Failed to initialize configuration dialog');
  }
};
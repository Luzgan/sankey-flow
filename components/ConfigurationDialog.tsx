import React, { useState, useEffect } from "react";
import { Worksheet } from "@tableau/extensions-api-types";

interface ConfigurationDialogProps {
  worksheet: Worksheet;
  onClose: () => void;
  onSave: (settings: ExtensionSettings) => void;
}

export interface ExtensionSettings {
  colorScheme: "default" | "colorblind" | "monochrome";
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  colorScheme: "default",
};

export const ConfigurationDialog: React.FC<ConfigurationDialogProps> = ({
  worksheet,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        if (
          typeof tableau !== "undefined" &&
          tableau.extensions &&
          tableau.extensions.settings
        ) {
          const colorScheme = tableau.extensions.settings.get("colorScheme");
          if (colorScheme) {
            setSettings({
              colorScheme: colorScheme as ExtensionSettings["colorScheme"],
            });
          }
        }
      } catch (error) {
        console.warn("Error loading settings:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      // Check if Tableau Extensions API is available
      if (
        typeof tableau === "undefined" ||
        !tableau.extensions ||
        !tableau.extensions.settings
      ) {
        console.warn(
          "Tableau Extensions API not available, cannot save settings"
        );
        alert("Cannot save settings - Tableau Extensions API not available");
        return;
      }

      // Save settings to Tableau
      tableau.extensions.settings.set("colorScheme", settings.colorScheme);
      await tableau.extensions.settings.saveAsync();

      // Notify parent component
      onSave(settings);

      // Close dialog
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const handleColorSchemeChange = (
    colorScheme: ExtensionSettings["colorScheme"]
  ) => {
    setSettings((prev) => ({ ...prev, colorScheme }));
  };

  // Don't render until initialized to prevent re-render loops
  if (!isInitialized) {
    return (
      <div className="configuration-dialog">
        <div className="dialog-header">
          <h3>Sankey Chart Configuration</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-content">
          <div className="loading">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="configuration-dialog">
      <div className="dialog-header">
        <h3>Sankey Chart Configuration</h3>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="dialog-content">
        <div className="form-group">
          <label htmlFor="colorScheme">Color Scheme:</label>
          <select
            id="colorScheme"
            value={settings.colorScheme}
            onChange={(e) =>
              handleColorSchemeChange(
                e.target.value as ExtensionSettings["colorScheme"]
              )
            }
          >
            <option value="default">Default</option>
            <option value="colorblind">Colorblind-friendly</option>
            <option value="monochrome">Monochrome</option>
          </select>
          <div className="help-text">
            Choose a color scheme that works best for your audience and data
            visualization needs.
          </div>
        </div>
      </div>

      <div className="dialog-footer">
        <button className="cancel-button" onClick={onClose}>
          Cancel
        </button>
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};

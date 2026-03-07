import React, { useState, useEffect } from "react";
import { TableauSettings, TableauUI } from "../utils/tableau-api-utils";

interface ExtensionSettings {
  colorScheme: "default" | "colorblind" | "monochrome";
}

export const ConfigurationApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({
    colorScheme: "default",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load current settings from Tableau
  useEffect(() => {
    const loadSettings = () => {
      try {
        const colorScheme = TableauSettings.get("colorScheme");
        if (colorScheme) {
          setSettings({
            colorScheme: colorScheme as ExtensionSettings["colorScheme"],
          });
        }
      } catch (error) {
        console.warn("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleColorSchemeChange = (colorScheme: ExtensionSettings["colorScheme"]) => {
    setSettings((prev) => ({ ...prev, colorScheme }));
  };

  const handleSave = async () => {
    try {
      // Save settings to Tableau
      const setSuccess = TableauSettings.set("colorScheme", settings.colorScheme);
      if (!setSuccess) {
        alert("Failed to save settings. Please try again.");
        return;
      }

      const saveSuccess = await TableauSettings.save();
      if (!saveSuccess) {
        alert("Failed to save settings. Please try again.");
        return;
      }

      // Close dialog with the saved settings as payload
      TableauUI.closeDialog(JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const handleCancel = () => {
    TableauUI.closeDialog();
  };

  if (isLoading) {
    return (
      <div className="config-container">
        <div className="loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="config-container">
      <div className="config-header">
        <h2>Sankey Chart Configuration</h2>
        <p>Configure the appearance and behavior of your Sankey chart visualization.</p>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label htmlFor="colorScheme">Color Scheme:</label>
          <select
            id="colorScheme"
            value={settings.colorScheme}
            onChange={(e) =>
              handleColorSchemeChange(e.target.value as ExtensionSettings["colorScheme"])
            }
          >
            <option value="default">Default</option>
            <option value="colorblind">Colorblind-friendly</option>
            <option value="monochrome">Monochrome</option>
          </select>
          <div className="help-text">
            Choose a color scheme that works best for your audience and data visualization needs.
          </div>
        </div>
      </div>

      <div className="button-group">
        <button className="btn btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button className="btn btn-save" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};
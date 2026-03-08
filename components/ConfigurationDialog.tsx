import React, { useState, useEffect } from "react";
import { Worksheet } from "@tableau/extensions-api-types";
import {
  ExtensionSettings,
  DEFAULT_SETTINGS,
} from "../utils/constants";

export type { ExtensionSettings };

interface ConfigurationDialogProps {
  worksheet: Worksheet;
  onClose: () => void;
  onSave: (settings: ExtensionSettings) => void;
}

export const ConfigurationDialog: React.FC<
  ConfigurationDialogProps
> = ({ worksheet, onClose, onSave }) => {
  const [settings, setSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadSettings = () => {
      try {
        if (
          typeof tableau !== "undefined" &&
          tableau.extensions &&
          tableau.extensions.settings
        ) {
          const loaded: Partial<ExtensionSettings> = {};
          for (const key of Object.keys(
            DEFAULT_SETTINGS
          ) as Array<keyof ExtensionSettings>) {
            const value = tableau.extensions.settings.get(key);
            if (value !== undefined) {
              if (typeof DEFAULT_SETTINGS[key] === "boolean") {
                (loaded as any)[key] = value === "true";
              } else {
                (loaded as any)[key] = value;
              }
            }
          }
          setSettings({ ...DEFAULT_SETTINGS, ...loaded });
        }
      } catch (error) {
        console.warn("Error loading settings:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      if (
        typeof tableau === "undefined" ||
        !tableau.extensions ||
        !tableau.extensions.settings
      ) {
        alert(
          "Cannot save settings - Tableau Extensions API not available"
        );
        return;
      }

      for (const [key, value] of Object.entries(settings)) {
        tableau.extensions.settings.set(key, String(value));
      }
      await tableau.extensions.settings.saveAsync();

      onSave(settings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  if (!isInitialized) {
    return (
      <div className="configuration-dialog">
        <div className="dialog-header">
          <h3>Sankey Chart Configuration</h3>
          <button className="close-button" onClick={onClose}>
            &times;
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
          &times;
        </button>
      </div>

      <div className="dialog-content">
        <div className="form-group">
          <label htmlFor="colorScheme">Color Scheme</label>
          <select
            id="colorScheme"
            value={settings.colorScheme}
            onChange={(e) =>
              updateSetting(
                "colorScheme",
                e.target.value as ExtensionSettings["colorScheme"]
              )
            }
          >
            <option value="default">Default</option>
            <option value="colorblind">Colorblind-friendly</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="linkStyle">Link Style</label>
          <select
            id="linkStyle"
            value={settings.linkStyle}
            onChange={(e) =>
              updateSetting(
                "linkStyle",
                e.target.value as ExtensionSettings["linkStyle"]
              )
            }
          >
            <option value="gradient">Gradient</option>
            <option value="source">Source Color</option>
            <option value="target">Target Color</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nodeAlignment">Node Alignment</label>
          <select
            id="nodeAlignment"
            value={settings.nodeAlignment}
            onChange={(e) =>
              updateSetting(
                "nodeAlignment",
                e.target
                  .value as ExtensionSettings["nodeAlignment"]
              )
            }
          >
            <option value="justify">Justify</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="center">Center</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="labelPosition">Label Position</label>
          <select
            id="labelPosition"
            value={settings.labelPosition}
            onChange={(e) =>
              updateSetting(
                "labelPosition",
                e.target
                  .value as ExtensionSettings["labelPosition"]
              )
            }
          >
            <option value="auto">Auto</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nodeSort">Node Sort</label>
          <select
            id="nodeSort"
            value={settings.nodeSort}
            onChange={(e) =>
              updateSetting(
                "nodeSort",
                e.target.value as ExtensionSettings["nodeSort"]
              )
            }
          >
            <option value="auto">Auto</option>
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.showValues}
              onChange={(e) =>
                updateSetting("showValues", e.target.checked)
              }
            />
            Show Values
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.showPercentages}
              onChange={(e) =>
                updateSetting(
                  "showPercentages",
                  e.target.checked
                )
              }
            />
            Show Percentages on Hover
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.aggregateLinks}
              onChange={(e) =>
                updateSetting(
                  "aggregateLinks",
                  e.target.checked
                )
              }
            />
            Aggregate Links
          </label>
          <div className="help-text">
            Combine links between the same nodes into a single
            link with summed values.
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

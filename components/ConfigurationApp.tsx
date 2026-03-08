import React, { useState, useEffect } from "react";
import {
  TableauSettings,
  TableauUI,
} from "../utils/tableau-api-utils";
import {
  ExtensionSettings,
  DEFAULT_SETTINGS,
  NODE_PADDING_MIN,
  NODE_PADDING_MAX,
  NODE_WIDTH_MIN,
  NODE_WIDTH_MAX,
} from "../utils/constants";

interface RadioOption {
  value: string;
  label: string;
  description: string;
}

const COLOR_SCHEME_OPTIONS: RadioOption[] = [
  { value: "default", label: "Standard", description: "Balanced palette for general use" },
  { value: "colorblind", label: "Colorblind-friendly", description: "Optimized for color vision deficiency" },
  { value: "monochrome", label: "Grayscale", description: "Single-hue palette for print or minimal design" },
  { value: "custom", label: "Custom", description: "Define your own colors" },
];

const LINK_STYLE_OPTIONS: RadioOption[] = [
  { value: "gradient", label: "Gradient", description: "Smooth color blend from source to target" },
  { value: "source", label: "Source color", description: "Flows match the color of their origin node" },
  { value: "target", label: "Target color", description: "Flows match the color of their destination node" },
];

const NODE_ALIGNMENT_OPTIONS: RadioOption[] = [
  { value: "justify", label: "Stretch to fill", description: "Nodes spread to use the full chart height" },
  { value: "left", label: "Pack to top", description: "Nodes pushed to the top, gaps at the bottom" },
  { value: "right", label: "Pack to bottom", description: "Nodes pushed to the bottom, gaps at the top" },
  { value: "center", label: "Pack to center", description: "Nodes grouped in the middle, gaps on both sides" },
];

const LABEL_POSITION_OPTIONS: RadioOption[] = [
  { value: "auto", label: "Auto", description: "Outside on first/last columns, centered on middle columns" },
  { value: "inside", label: "Inside", description: "Always centered on the node" },
  { value: "outside", label: "Outside", description: "Always outside the node" },
];

const NODE_SORT_OPTIONS: RadioOption[] = [
  { value: "auto", label: "Minimize crossings", description: "Algorithm reorders nodes to reduce overlapping flows" },
  { value: "ascending", label: "Smallest at top", description: "Nodes with the lowest values appear first" },
  { value: "descending", label: "Largest at top", description: "Nodes with the highest values appear first" },
  { value: "alphabetical", label: "Alphabetical", description: "A\u2013Z ordering" },
];

const LABEL_ALIGN_OPTIONS: RadioOption[] = [
  { value: "left", label: "Left", description: "Text aligned to the left edge of the node" },
  { value: "center", label: "Center", description: "Text centered within the node" },
  { value: "right", label: "Right", description: "Text aligned to the right edge of the node" },
];

const LABEL_VERTICAL_ALIGN_OPTIONS: RadioOption[] = [
  { value: "top", label: "Top", description: "Labels near the top of each node" },
  { value: "middle", label: "Middle", description: "Labels vertically centered" },
  { value: "bottom", label: "Bottom", description: "Labels near the bottom of each node" },
];

const TOOLTIP_MODE_OPTIONS: RadioOption[] = [
  { value: "minimal", label: "Minimal", description: "Name and value only" },
  { value: "detailed", label: "Detailed", description: "Name, value, percentage, and flow direction" },
  { value: "custom", label: "Custom template", description: "Define your own HTML template with placeholders" },
];

const LEGEND_POSITION_OPTIONS: RadioOption[] = [
  { value: "bottom", label: "Bottom", description: "Legend below the chart" },
  { value: "right", label: "Right", description: "Legend to the right of the chart" },
];

const CLICK_ACTION_OPTIONS: RadioOption[] = [
  { value: "select", label: "Select marks", description: "Highlight connected links in the chart" },
  { value: "filter", label: "Filter node", description: "Filter dashboard to show only the clicked node\u2019s data" },
  { value: "filterConnected", label: "Filter connected", description: "Filter dashboard to show all data flowing through the clicked node" },
];

const SectionHeader: React.FC<{ title: string; first?: boolean }> = ({ title, first }) => (
  <div className={`section-header${first ? " section-header-first" : ""}`}>
    {title}
  </div>
);

const RadioGroup: React.FC<{
  label: string;
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
}> = ({ label, name, value, options, onChange }) => (
  <div className="form-group radio-group">
    <div className="radio-group-label">{label}</div>
    <div className="radio-options">
      {options.map((option) => (
        <label key={option.value} className={`radio-option${value === option.value ? " radio-option-selected" : ""}`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="radio-option-label">{option.label}</span>
          <div className="radio-option-description">{option.description}</div>
        </label>
      ))}
    </div>
  </div>
);

const CheckboxOption: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="form-group checkbox-group">
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
    <div className="help-text">{description}</div>
  </div>
);

const SliderOption: React.FC<{
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}> = ({ label, description, value, min, max, onChange }) => (
  <div className="form-group slider-group">
    <div className="slider-header">
      <span className="slider-label">{label}</span>
      <span className="slider-value">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider-input"
    />
    <div className="help-text">{description}</div>
  </div>
);

const CUSTOM_PALETTE_SIZE = 10;

const CustomPaletteEditor: React.FC<{
  colorsJson: string;
  onChange: (json: string) => void;
}> = ({ colorsJson, onChange }) => {
  let colors: string[];
  try {
    const parsed: unknown = JSON.parse(colorsJson);
    colors = Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    colors = [];
  }

  // Pad to CUSTOM_PALETTE_SIZE with fallback color
  while (colors.length < CUSTOM_PALETTE_SIZE) {
    colors.push("#808080");
  }

  const handleColorChange = (index: number, value: string): void => {
    const updated = [...colors];
    updated[index] = value;
    onChange(JSON.stringify(updated.slice(0, CUSTOM_PALETTE_SIZE)));
  };

  return (
    <div className="custom-palette-editor">
      <div className="custom-palette-swatches">
        {colors.slice(0, CUSTOM_PALETTE_SIZE).map((color, i) => (
          <input
            key={i}
            type="color"
            className="color-swatch"
            value={color}
            onChange={(e) => handleColorChange(i, e.target.value)}
            title={`Color ${i + 1}: ${color}`}
          />
        ))}
      </div>
      <div className="help-text">
        If a dimension is on the Tableau Color shelf, each unique value
        is sorted A–Z and gets colors left to right. Otherwise, each
        column gets the next color.
      </div>
    </div>
  );
};

export const ConfigurationApp: React.FC = () => {
  const [settings, setSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const loaded: Partial<ExtensionSettings> = {};
        for (const key of Object.keys(
          DEFAULT_SETTINGS
        ) as Array<keyof ExtensionSettings>) {
          const value = TableauSettings.get(key);
          if (value !== undefined) {
            if (typeof DEFAULT_SETTINGS[key] === "boolean") {
              (loaded as any)[key] = value === "true";
            } else if (typeof DEFAULT_SETTINGS[key] === "number") {
              const parsed = Number(value);
              if (!isNaN(parsed)) (loaded as any)[key] = parsed;
            } else {
              (loaded as any)[key] = value;
            }
          }
        }
        setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      } catch (error) {
        console.warn("Error loading settings:", error);
      } finally {
        setIsLoading(false);
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
      for (const [key, value] of Object.entries(settings)) {
        const setSuccess = TableauSettings.set(
          key,
          String(value)
        );
        if (!setSuccess) {
          alert("Failed to save settings. Please try again.");
          return;
        }
      }

      const saveSuccess = await TableauSettings.save();
      if (!saveSuccess) {
        alert("Failed to save settings. Please try again.");
        return;
      }

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
        <p>Configure the appearance and behavior of your Sankey chart.</p>
      </div>

      <div className="config-form">
        <SectionHeader title="Colors" first />
        <RadioGroup
          label="Color Palette"
          name="colorScheme"
          value={settings.colorScheme}
          onChange={(v) => updateSetting("colorScheme", v as ExtensionSettings["colorScheme"])}
          options={COLOR_SCHEME_OPTIONS}
        />
        {settings.colorScheme === "custom" && (
          <CustomPaletteEditor
            colorsJson={settings.customColors}
            onChange={(json) => updateSetting("customColors", json)}
          />
        )}
        <RadioGroup
          label="Flow Colors"
          name="linkStyle"
          value={settings.linkStyle}
          onChange={(v) => updateSetting("linkStyle", v as ExtensionSettings["linkStyle"])}
          options={LINK_STYLE_OPTIONS}
        />

        <SectionHeader title="Layout" />
        <RadioGroup
          label="Node Distribution"
          name="nodeAlignment"
          value={settings.nodeAlignment}
          onChange={(v) => updateSetting("nodeAlignment", v as ExtensionSettings["nodeAlignment"])}
          options={NODE_ALIGNMENT_OPTIONS}
        />
        <RadioGroup
          label="Node Sort Order"
          name="nodeSort"
          value={settings.nodeSort}
          onChange={(v) => updateSetting("nodeSort", v as ExtensionSettings["nodeSort"])}
          options={NODE_SORT_OPTIONS}
        />
        <SliderOption
          label="Node spacing"
          description="Vertical gap between nodes in the same column"
          value={settings.nodePadding}
          min={NODE_PADDING_MIN}
          max={NODE_PADDING_MAX}
          onChange={(v) => updateSetting("nodePadding", v)}
        />
        <SliderOption
          label="Node width"
          description="Horizontal width of each node rectangle"
          value={settings.nodeWidth}
          min={NODE_WIDTH_MIN}
          max={NODE_WIDTH_MAX}
          onChange={(v) => updateSetting("nodeWidth", v)}
        />

        <SectionHeader title="Labels" />
        <RadioGroup
          label="Label Position"
          name="labelPosition"
          value={settings.labelPosition}
          onChange={(v) => updateSetting("labelPosition", v as ExtensionSettings["labelPosition"])}
          options={LABEL_POSITION_OPTIONS}
        />
        {settings.labelPosition === "inside" && (
          <>
            <RadioGroup
              label="Horizontal Alignment"
              name="labelAlign"
              value={settings.labelAlign}
              onChange={(v) => updateSetting("labelAlign", v as ExtensionSettings["labelAlign"])}
              options={LABEL_ALIGN_OPTIONS}
            />
            <RadioGroup
              label="Vertical Alignment"
              name="labelVerticalAlign"
              value={settings.labelVerticalAlign}
              onChange={(v) => updateSetting("labelVerticalAlign", v as ExtensionSettings["labelVerticalAlign"])}
              options={LABEL_VERTICAL_ALIGN_OPTIONS}
            />
          </>
        )}

        <SectionHeader title="Display" />
        <CheckboxOption
          label="Show values on nodes"
          description="Display numeric values below node names"
          checked={settings.showValues}
          onChange={(v) => updateSetting("showValues", v)}
        />
        <CheckboxOption
          label="Show labels on flows"
          description="Display flow values along the link paths (only on wide links)"
          checked={settings.showLinkLabels}
          onChange={(v) => updateSetting("showLinkLabels", v)}
        />
        <CheckboxOption
          label="Combine duplicate flows"
          description="Merge flows between the same nodes into a single flow with summed values"
          checked={settings.aggregateLinks}
          onChange={(v) => updateSetting("aggregateLinks", v)}
        />
        <CheckboxOption
          label="Ignore empty values"
          description="Skip rows where any level field is null or empty"
          checked={settings.ignoreNulls}
          onChange={(v) => updateSetting("ignoreNulls", v)}
        />
        <CheckboxOption
          label="Show legend"
          description="Display a color legend for the chart"
          checked={settings.showLegend}
          onChange={(v) => updateSetting("showLegend", v)}
        />
        {settings.showLegend && (
          <RadioGroup
            label="Legend Position"
            name="legendPosition"
            value={settings.legendPosition}
            onChange={(v) => updateSetting("legendPosition", v as ExtensionSettings["legendPosition"])}
            options={LEGEND_POSITION_OPTIONS}
          />
        )}

        <SectionHeader title="Tooltips" />
        <CheckboxOption
          label="Show tooltips"
          description="Show value and percentage when hovering over flows or nodes"
          checked={settings.showPercentages}
          onChange={(v) => updateSetting("showPercentages", v)}
        />
        {settings.showPercentages && (
          <>
            <RadioGroup
              label="Tooltip Style"
              name="tooltipMode"
              value={settings.tooltipMode}
              onChange={(v) => updateSetting("tooltipMode", v as ExtensionSettings["tooltipMode"])}
              options={TOOLTIP_MODE_OPTIONS}
            />
            {settings.tooltipMode === "custom" && (
              <div className="form-group">
                <div className="radio-group-label">Custom Template</div>
                <textarea
                  className="template-textarea"
                  value={settings.tooltipTemplate}
                  onChange={(e) => updateSetting("tooltipTemplate", e.target.value)}
                  rows={4}
                />
                <div className="help-text">
                  Placeholders: {"{name}"}, {"{value}"}, {"{percentage}"}, {"{source}"}, {"{target}"}, {"{level}"}. Basic HTML allowed.
                </div>
              </div>
            )}
          </>
        )}

        <SectionHeader title="Interaction" />
        <RadioGroup
          label="Click Behavior"
          name="clickAction"
          value={settings.clickAction}
          onChange={(v) => updateSetting("clickAction", v as ExtensionSettings["clickAction"])}
          options={CLICK_ACTION_OPTIONS}
        />
        <CheckboxOption
          label="Enable node dragging"
          description="Allow repositioning nodes by dragging (may conflict with click selection)"
          checked={settings.enableDrag}
          onChange={(v) => updateSetting("enableDrag", v)}
        />
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

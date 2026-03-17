import React, { useState, useEffect, useRef } from "react";
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
  { value: "custom", label: "Custom palette", description: "Define your own 10-color palette" },
];

const FLOW_STYLE_OPTIONS: RadioOption[] = [
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
  { value: "auto", label: "Data order", description: "Nodes appear in the order they occur in the data (stable across settings changes)" },
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
  { value: "minimal", label: "Simple", description: "Shows name and value" },
  { value: "detailed", label: "Full details", description: "Shows name, value, percentage, and where the flow comes from and goes to" },
  { value: "custom", label: "Custom layout", description: "Design your own tooltip using keywords that get replaced with real data" },
];

const SANKEY_TYPE_OPTIONS: RadioOption[] = [
  { value: "standard", label: "Standard", description: "Multi-stage left-to-right flow diagram" },
  { value: "dropoff", label: "Drop-off", description: "Show lost value as drop-off nodes at each stage" },
];

const DROPOFF_COLOR_OPTIONS: RadioOption[] = [
  { value: "default", label: "Default", description: "All drop-off nodes use the standard red color" },
  { value: "perNode", label: "Per node", description: "Click any drop-off node in author mode to pick its color" },
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
  renderExtra?: (optionValue: string) => React.ReactNode;
}> = ({ label, name, value, options, onChange, renderExtra }) => (
  <div className="form-group radio-group">
    <div className="radio-group-label">{label}</div>
    <div className="radio-options">
      {options.map((option) => (
        <div key={option.value}>
          <label className={`radio-option${value === option.value ? " radio-option-selected" : ""}`}>
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
          {value === option.value && renderExtra && renderExtra(option.value)}
        </div>
      ))}
    </div>
  </div>
);

const CheckboxOption: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
}> = ({ label, description, checked, onChange, disabled, indeterminate }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);
  return (
    <div className="form-group checkbox-group">
      <label style={disabled ? { opacity: 0.6, cursor: "default" } : undefined}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      <div className="help-text">{description}</div>
    </div>
  );
};

const SliderOption: React.FC<{
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  reversed?: boolean;
  onChange: (value: number) => void;
}> = ({ label, description, value, min, max, step, reversed, onChange }) => (
  <div className="form-group slider-group">
    <div className="slider-header">
      <span className="slider-label">{label}</span>
      <span className="slider-value">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider-input"
      style={reversed ? { direction: "rtl" } : undefined}
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

const NodeColorEditor: React.FC<{
  overridesJson: string;
  onChange: (json: string) => void;
}> = ({ overridesJson, onChange }) => {
  let overrides: Record<string, string>;
  try {
    const parsed: unknown = JSON.parse(overridesJson);
    overrides = (parsed && typeof parsed === "object") ? parsed as Record<string, string> : {};
  } catch {
    overrides = {};
  }

  const [newName, setNewName] = useState("");

  const handleColorChange = (name: string, color: string): void => {
    const updated = { ...overrides, [name]: color };
    onChange(JSON.stringify(updated));
  };

  const handleRemove = (name: string): void => {
    const updated = { ...overrides };
    delete updated[name];
    onChange(JSON.stringify(updated));
  };

  const handleAdd = (): void => {
    if (!newName.trim()) return;
    const updated = { ...overrides, [newName.trim()]: "#4e79a7" };
    onChange(JSON.stringify(updated));
    setNewName("");
  };

  return (
    <div className="custom-palette-editor">
      {Object.entries(overrides).map(([name, color]) => (
        <div key={name} className="node-color-row">
          <input
            type="color"
            className="color-swatch"
            value={color}
            onChange={(e) => handleColorChange(name, e.target.value)}
          />
          <span className="node-color-name">{name}</span>
          <button className="node-color-remove" onClick={() => handleRemove(name)} title="Remove">&times;</button>
        </div>
      ))}
      <div className="node-color-add">
        <input
          type="text"
          placeholder="Node name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="node-color-input"
        />
        <button onClick={handleAdd} className="btn btn-save" style={{ padding: "4px 12px", minWidth: "auto" }}>Add</button>
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
        // Backward compat: migrate "perNode" colorScheme to "default" with overrides
        if ((loaded as any).colorScheme === "perNode") {
          (loaded as any).colorScheme = "default";
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

  // Labels parent checkbox state
  const labelChildren = [settings.showLabels, settings.showValues, settings.showFlowLabels, settings.showStageLabels];
  const allLabelsOn = labelChildren.every(Boolean);
  const allLabelsOff = labelChildren.every((v) => !v);
  const labelsIndeterminate = !allLabelsOn && !allLabelsOff;

  const handleAllLabelsToggle = (checked: boolean): void => {
    setSettings((prev) => ({
      ...prev,
      showLabels: checked,
      showValues: checked,
      showFlowLabels: checked,
      showStageLabels: checked,
    }));
  };


  const anyLabelShown = settings.showLabels || settings.showValues || settings.showFlowLabels || settings.showStageLabels;

  return (
    <div className="config-container">
      <div className="config-header">
        <h2>Sankey Flow</h2>
        <p>Configure the appearance and behavior of your chart.</p>
      </div>

      <div className="config-form">
        <SectionHeader title="Chart Type" first />
        <RadioGroup
          label="Sankey Type"
          name="sankeyType"
          value={settings.sankeyType}
          onChange={(v) => updateSetting("sankeyType", v as ExtensionSettings["sankeyType"])}
          options={SANKEY_TYPE_OPTIONS}
        />

        <SectionHeader title="Colors" />
        <RadioGroup
          label="Node colors"
          name="colorScheme"
          value={settings.colorScheme}
          onChange={(v) => updateSetting("colorScheme", v as ExtensionSettings["colorScheme"])}
          options={COLOR_SCHEME_OPTIONS}
          renderExtra={(v) => {
            if (v === "custom") return (
              <CustomPaletteEditor
                colorsJson={settings.customColors}
                onChange={(json) => updateSetting("customColors", json)}
              />
            );
            return null;
          }}
        />

        <CheckboxOption
          label="Override individual node colors"
          description="Click any node in author mode to pick its color. Overrides apply on top of whatever palette is selected above."
          checked={settings.enableNodeColorOverrides}
          onChange={(v) => updateSetting("enableNodeColorOverrides", v)}
        />
        {settings.enableNodeColorOverrides && (
          <>
            <NodeColorEditor
              overridesJson={settings.nodeColorOverrides}
              onChange={(json) => updateSetting("nodeColorOverrides", json)}
            />
          </>
        )}

        <RadioGroup
          label="Flow colors"
          name="flowStyle"
          value={settings.flowStyle}
          onChange={(v) => updateSetting("flowStyle", v as ExtensionSettings["flowStyle"])}
          options={FLOW_STYLE_OPTIONS}
        />

        {settings.sankeyType === "dropoff" && (
          <RadioGroup
            label="Drop-off node colors"
            name="dropoffColorMode"
            value={settings.dropoffColorMode}
            onChange={(v) => updateSetting("dropoffColorMode", v as ExtensionSettings["dropoffColorMode"])}
            options={DROPOFF_COLOR_OPTIONS}
            renderExtra={(v) => {
              if (v === "perNode") return (
                <NodeColorEditor
                  overridesJson={settings.dropoffNodeColors}
                  onChange={(json) => updateSetting("dropoffNodeColors", json)}
                />
              );
              return null;
            }}
          />
        )}

        <SectionHeader title="Layout" />
        <RadioGroup
          label="Node Sort Order"
          name="nodeSort"
          value={settings.nodeSort}
          onChange={(v) => updateSetting("nodeSort", v as ExtensionSettings["nodeSort"])}
          options={NODE_SORT_OPTIONS}
        />
        <RadioGroup
          label="Vertical alignment"
          name="nodeAlignment"
          value={settings.nodeAlignment}
          onChange={(v) => updateSetting("nodeAlignment", v as ExtensionSettings["nodeAlignment"])}
          options={NODE_ALIGNMENT_OPTIONS}
        />
        <div className="help-text" style={{ marginBottom: 8 }}>
          Controls vertical positioning of nodes. <b>Only</b> visible when nodes have different sizes across a stage.
        </div>
        <CheckboxOption
          label="Override node order manually"
          description="Drag nodes up or down to override the sort order. The sort above is applied first, then your adjustments are layered on top."
          checked={settings.enableDrag}
          onChange={(v) => updateSetting("enableDrag", v)}
        />
        {settings.enableDrag && (() => {
          let savedOrder: Record<string, string[]> = {};
          try {
            const parsed: unknown = JSON.parse(settings.nodePositions);
            if (parsed && typeof parsed === "object") savedOrder = parsed as Record<string, string[]>;
          } catch { /* fallback */ }
          const columnCount = Object.keys(savedOrder).length;
          if (columnCount === 0) return (
            <div className="help-text" style={{ marginLeft: 24, marginBottom: 12 }}>
              No manual overrides yet. Drag nodes up or down on the chart to reorder them within a column. Nodes snap into place as you drag.
            </div>
          );
          return (
            <div style={{ marginLeft: 24, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div className="help-text" style={{ margin: 0 }}>
                Custom order set for {columnCount} column{columnCount === 1 ? "" : "s"}
              </div>
              <button
                onClick={() => updateSetting("nodePositions", "{}")}
                className="btn btn-cancel"
                style={{ padding: "4px 12px", minWidth: "auto", fontSize: 12 }}
              >
                Reset
              </button>
            </div>
          );
        })()}
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
        <CheckboxOption
          label="Show node borders"
          description="Draw a border around each node rectangle"
          checked={settings.showNodeBorders}
          onChange={(v) => updateSetting("showNodeBorders", v)}
        />

        <SectionHeader title="Flows" />
        <SliderOption
          label="Flow opacity"
          description="Drag left for more opaque, right for more transparent"
          value={settings.flowOpacity}
          min={0.05}
          max={1}
          step={0.05}
          reversed
          onChange={(v) => updateSetting("flowOpacity", v)}
        />
        <SliderOption
          label="Flow gap"
          description="Horizontal gap between nodes and flow connection points"
          value={settings.flowGap}
          min={0}
          max={20}
          onChange={(v) => updateSetting("flowGap", v)}
        />
        <CheckboxOption
          label="Merge duplicate flows"
          description="When multiple data rows connect the same two nodes, combine them into a single flow with the summed value"
          checked={settings.aggregateFlows}
          onChange={(v) => updateSetting("aggregateFlows", v)}
        />

        <SectionHeader title="Labels" />
        <CheckboxOption
          label="Show labels"
          description="Master toggle for all text labels on the chart"
          checked={allLabelsOn || labelsIndeterminate}
          indeterminate={labelsIndeterminate}
          onChange={handleAllLabelsToggle}
        />
        <div style={{ marginLeft: 24 }}>
          <CheckboxOption
            label="Node names"
            description="Text labels on each node"
            checked={settings.showLabels}
            onChange={(v) => updateSetting("showLabels", v)}
          />
          {settings.showLabels && (
            <RadioGroup
              label="Node label position"
              name="labelPosition"
              value={settings.labelPosition}
              onChange={(v) => updateSetting("labelPosition", v as ExtensionSettings["labelPosition"])}
              options={LABEL_POSITION_OPTIONS}
              renderExtra={(v) => v === "inside" ? (
                <div style={{ marginLeft: 28, marginBottom: 8 }}>
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
                </div>
              ) : null}
            />
          )}
          <CheckboxOption
            label="Node values"
            description="Numeric values below node names"
            checked={settings.showValues}
            onChange={(v) => updateSetting("showValues", v)}
          />
          <CheckboxOption
            label="Flow values"
            description="Values along flow paths (only on wide flows)"
            checked={settings.showFlowLabels}
            onChange={(v) => updateSetting("showFlowLabels", v)}
          />
          <CheckboxOption
            label="Stage names"
            description="Column headers at the top of the chart"
            checked={settings.showStageLabels}
            onChange={(v) => updateSetting("showStageLabels", v)}
          />
        </div>

        {anyLabelShown && (
          <>
            <CheckboxOption
              label="Override Tableau font"
              description="By default, labels use the font from Tableau's workbook formatting. Check this to set custom size and weight per label type."
              checked={settings.useCustomLabelFont}
              onChange={(v) => updateSetting("useCustomLabelFont", v)}
            />
            {settings.useCustomLabelFont && (
              <div style={{ marginLeft: 24 }}>
                {settings.showLabels && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="radio-group-label">Node names</div>
                    <SliderOption
                      label="Font size"
                      description=""
                      value={settings.labelFontSize}
                      min={8}
                      max={24}
                      onChange={(v) => updateSetting("labelFontSize", v)}
                    />
                    <CheckboxOption
                      label="Bold"
                      description=""
                      checked={settings.labelFontWeight === "bold"}
                      onChange={(v) => updateSetting("labelFontWeight", v ? "bold" : "normal")}
                    />
                  </div>
                )}
                {settings.showValues && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="radio-group-label">Node values</div>
                    <SliderOption
                      label="Font size"
                      description=""
                      value={settings.valueLabelFontSize}
                      min={8}
                      max={24}
                      onChange={(v) => updateSetting("valueLabelFontSize", v)}
                    />
                    <CheckboxOption
                      label="Bold"
                      description=""
                      checked={settings.valueLabelFontWeight === "bold"}
                      onChange={(v) => updateSetting("valueLabelFontWeight", v ? "bold" : "normal")}
                    />
                  </div>
                )}
                {settings.showFlowLabels && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="radio-group-label">Flow values</div>
                    <SliderOption
                      label="Font size"
                      description=""
                      value={settings.flowLabelFontSize}
                      min={8}
                      max={24}
                      onChange={(v) => updateSetting("flowLabelFontSize", v)}
                    />
                    <CheckboxOption
                      label="Bold"
                      description=""
                      checked={settings.flowLabelFontWeight === "bold"}
                      onChange={(v) => updateSetting("flowLabelFontWeight", v ? "bold" : "normal")}
                    />
                  </div>
                )}
                {settings.showStageLabels && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="radio-group-label">Stage names</div>
                    <SliderOption
                      label="Font size"
                      description=""
                      value={settings.stageLabelFontSize}
                      min={8}
                      max={24}
                      onChange={(v) => updateSetting("stageLabelFontSize", v)}
                    />
                    <CheckboxOption
                      label="Bold"
                      description=""
                      checked={settings.stageLabelFontWeight === "bold"}
                      onChange={(v) => updateSetting("stageLabelFontWeight", v ? "bold" : "normal")}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <SectionHeader title="Display" />
        <CheckboxOption
          label="Ignore empty values"
          description={settings.sankeyType === "dropoff"
            ? "Always on in drop-off mode \u2014 empty values become drop-off nodes"
            : "Skip rows where any stage field is null or empty"}
          checked={settings.sankeyType === "dropoff" ? true : settings.ignoreNulls}
          disabled={settings.sankeyType === "dropoff"}
          onChange={(v) => {
            if (settings.sankeyType !== "dropoff") updateSetting("ignoreNulls", v);
          }}
        />
        <SectionHeader title="Tooltips" />
        {(() => {
          const tooltipValue = settings.showTableauTooltip ? "tableau" : settings.showPercentages ? "extension" : "off";
          return (
            <RadioGroup
              label="Tooltip mode"
              name="tooltipMode-top"
              value={tooltipValue}
              onChange={(v) => {
                updateSetting("showPercentages", v === "extension");
                updateSetting("showTableauTooltip", v === "tableau");
              }}
              options={[
                { value: "tableau", label: "Tableau tooltip", description: "Show Tableau\u2019s native tooltip with the underlying data row" },
                { value: "extension", label: "Extension tooltip", description: "Show value and percentage on hover" },
                { value: "off", label: "Off", description: "No tooltips on hover" },
              ]}
              renderExtra={(v) => v === "extension" ? (
                <div style={{ marginLeft: 24, marginTop: 4 }}>
                  <RadioGroup
                    label="Style"
                    name="tooltipStyle"
                    value={settings.tooltipMode}
                    onChange={(v) => updateSetting("tooltipMode", v as ExtensionSettings["tooltipMode"])}
                    options={[
                      TOOLTIP_MODE_OPTIONS[0],
                      TOOLTIP_MODE_OPTIONS[2],
                      TOOLTIP_MODE_OPTIONS[1],
                    ]}
                    renderExtra={(v) => v === "custom" ? (
                      <div className="form-group" style={{ marginLeft: 28, marginTop: 8 }}>
                        <textarea
                          className="template-textarea"
                          value={settings.tooltipTemplate}
                          onChange={(e) => updateSetting("tooltipTemplate", e.target.value)}
                          rows={4}
                        />
                        <div className="help-text">
                          Use these keywords — they will be replaced with actual data: {"{name}"} (node name), {"{value}"} (flow amount), {"{percentage}"} (share of total), {"{source}"} (where flow comes from), {"{target}"} (where flow goes to), {"{level}"} (stage name). Basic HTML allowed.
                        </div>
                      </div>
                    ) : null}
                  />
                </div>
              ) : null}
            />
          );
        })()}

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

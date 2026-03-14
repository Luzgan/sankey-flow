import React, { useState, useEffect, useRef } from "react";
import {
  ExtensionSettings,
  NODE_PADDING_MIN,
  NODE_PADDING_MAX,
  NODE_WIDTH_MIN,
  NODE_WIDTH_MAX,
} from "../utils/constants";

// ---------------------------------------------------------------------------
// Option definitions
// ---------------------------------------------------------------------------

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
  { value: "perStage", label: "Per stage", description: "Different color palettes for each stage" },
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
  { value: "auto", label: "Data order", description: "Nodes appear in the order they occur in the data" },
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

const SANKEY_TYPE_OPTIONS: RadioOption[] = [
  { value: "standard", label: "Standard", description: "Classic multi-stage flow diagram showing how values split, merge, and move between stages from left to right." },
  { value: "dropoff", label: "Drop-off", description: "Highlights value lost between stages. A drop-off node appears at each transition where the outgoing total is less than the incoming total. Requires at least 2 Stage dimensions and a Value measure to calculate differences." },
];

const DROPOFF_COLOR_OPTIONS: RadioOption[] = [
  { value: "default", label: "Default", description: "All drop-off nodes use the standard red color" },
  { value: "perStage", label: "Per stage", description: "Drop-off nodes inherit the color palette of their stage" },
];

// ---------------------------------------------------------------------------
// Primitive form components
// ---------------------------------------------------------------------------

const RadioGroup: React.FC<{
  label: string;
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  renderExtra?: (optionValue: string) => React.ReactNode;
}> = ({ label, name, value, options, onChange, renderExtra }) => (
  <div className="cp-form-group cp-radio-group">
    <div className="cp-radio-group-label">{label}</div>
    <div className="cp-radio-options">
      {options.map((option) => (
        <div key={option.value}>
          <label className={`cp-radio-option${value === option.value ? " cp-radio-option-selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="cp-radio-option-label">{option.label}</span>
            <div className="cp-radio-option-description">{option.description}</div>
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
    <div className="cp-form-group cp-checkbox-group">
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
      {description && <div className="cp-help-text">{description}</div>}
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
  <div className="cp-form-group cp-slider-group">
    <div className="cp-slider-header">
      <span className="cp-slider-label">{label}</span>
      <span className="cp-slider-value">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="cp-slider-input"
      style={reversed ? { direction: "rtl" } : undefined}
    />
    {description && <div className="cp-help-text">{description}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Complex editors
// ---------------------------------------------------------------------------

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
  while (colors.length < CUSTOM_PALETTE_SIZE) colors.push("#808080");

  const handleColorChange = (index: number, value: string): void => {
    const updated = [...colors];
    updated[index] = value;
    onChange(JSON.stringify(updated.slice(0, CUSTOM_PALETTE_SIZE)));
  };

  return (
    <div className="cp-palette-editor">
      <div className="cp-palette-swatches">
        {colors.slice(0, CUSTOM_PALETTE_SIZE).map((color, i) => (
          <input
            key={i}
            type="color"
            className="cp-color-swatch"
            value={color}
            onChange={(e) => handleColorChange(i, e.target.value)}
            title={`Color ${i + 1}: ${color}`}
          />
        ))}
      </div>
      <div className="cp-help-text" style={{ marginLeft: 0 }}>
        If a dimension is on the Tableau Color shelf, each unique value
        is sorted A\u2013Z and gets colors left to right. Otherwise, each
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
    onChange(JSON.stringify({ ...overrides, [name]: color }));
  };

  const handleRemove = (name: string): void => {
    const updated = { ...overrides };
    delete updated[name];
    onChange(JSON.stringify(updated));
  };

  const handleAdd = (): void => {
    if (!newName.trim()) return;
    onChange(JSON.stringify({ ...overrides, [newName.trim()]: "#4e79a7" }));
    setNewName("");
  };

  return (
    <div className="cp-palette-editor">
      {Object.entries(overrides).map(([name, color]) => (
        <div key={name} className="cp-node-color-row">
          <input
            type="color"
            className="cp-color-swatch"
            value={color}
            onChange={(e) => handleColorChange(name, e.target.value)}
          />
          <span className="cp-node-color-name">{name}</span>
          <button className="cp-node-color-remove" onClick={() => handleRemove(name)} title="Remove">&times;</button>
        </div>
      ))}
      <div className="cp-node-color-add">
        <input
          type="text"
          placeholder="Node name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="cp-node-color-input"
        />
        <button onClick={handleAdd} className="cp-btn cp-btn-secondary" style={{ padding: "4px 12px", minWidth: "auto" }}>Add</button>
      </div>
      <div className="cp-help-text" style={{ marginLeft: 0 }}>
        Click a node on the chart to pick its color, or type a name above and click Add.
      </div>
    </div>
  );
};

const STAGE_PALETTE_SIZE = 6;
const DEFAULT_STAGE_COLORS = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949"];

const StagePaletteEditor: React.FC<{
  palettesJson: string;
  onChange: (json: string) => void;
}> = ({ palettesJson, onChange }) => {
  let palettes: Record<string, string[]>;
  try {
    const parsed: unknown = JSON.parse(palettesJson);
    palettes = (parsed && typeof parsed === "object") ? parsed as Record<string, string[]> : {};
  } catch {
    palettes = {};
  }

  const stageKeys = Object.keys(palettes).map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);

  const updateStage = (level: number, colors: string[]): void => {
    onChange(JSON.stringify({ ...palettes, [String(level)]: colors }));
  };

  const handleColorChange = (level: number, index: number, color: string): void => {
    const current = palettes[String(level)] || DEFAULT_STAGE_COLORS.slice();
    const updated = [...current];
    updated[index] = color;
    updateStage(level, updated);
  };

  const addStage = (): void => {
    const nextLevel = stageKeys.length > 0 ? Math.max(...stageKeys) + 1 : 0;
    const offset = nextLevel % DEFAULT_STAGE_COLORS.length;
    const colors = [...DEFAULT_STAGE_COLORS.slice(offset), ...DEFAULT_STAGE_COLORS.slice(0, offset)];
    updateStage(nextLevel, colors.slice(0, STAGE_PALETTE_SIZE));
  };

  const removeStage = (level: number): void => {
    const updated = { ...palettes };
    delete updated[String(level)];
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="cp-palette-editor" style={{ textAlign: "left" }}>
      <div className="cp-help-text" style={{ marginBottom: 8, marginLeft: 0 }}>
        Each stage gets its own palette. Nodes cycle through the colors left to right.
      </div>
      {stageKeys.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="cp-help-text" style={{ margin: 0, fontStyle: "italic" }}>No stages configured yet.</div>
          <button onClick={addStage} className="cp-btn cp-btn-secondary" style={{ padding: "4px 12px", minWidth: "auto", fontSize: 13, whiteSpace: "nowrap" }}>
            + Add stage
          </button>
        </div>
      ) : (
        <>
          {stageKeys.map((level) => {
            const colors = palettes[String(level)] || [];
            while (colors.length < STAGE_PALETTE_SIZE) colors.push("#808080");
            return (
              <div key={level} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>Stage {level + 1}</span>
                  <button className="cp-node-color-remove" onClick={() => removeStage(level)} title="Remove stage">&times;</button>
                </div>
                <div className="cp-palette-swatches" style={{ justifyContent: "flex-start" }}>
                  {colors.slice(0, STAGE_PALETTE_SIZE).map((color, i) => (
                    <input
                      key={i}
                      type="color"
                      className="cp-color-swatch"
                      value={color}
                      onChange={(e) => handleColorChange(level, i, e.target.value)}
                      title={`Stage ${level + 1}, color ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={addStage} className="cp-btn cp-btn-secondary" style={{ padding: "4px 12px", minWidth: "auto", fontSize: 13 }}>
              + Add stage
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Accordion section
// ---------------------------------------------------------------------------

const AccordionSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  nested?: boolean;
}> = ({ title, isOpen, onToggle, children, nested }) => (
  <div className={nested ? "cp-accordion-nested" : "cp-accordion-section"}>
    <button className={nested ? "cp-accordion-nested-header" : "cp-accordion-header"} onClick={onToggle} type="button">
      <span className={nested ? "cp-accordion-nested-title" : "cp-accordion-title"}>{title}</span>
      <span className={`cp-accordion-chevron${isOpen ? " cp-accordion-chevron-open" : ""}`}>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
    {isOpen && <div className={nested ? "cp-accordion-nested-body" : "cp-accordion-body"}>{children}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// ConfigPanel
// ---------------------------------------------------------------------------

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExtensionSettings;
  onSettingChange: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  onBatchSettingChange: (changes: Partial<ExtensionSettings>) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  onBatchSettingChange,
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["chartType"]));

  const toggleSection = (section: string): void => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Labels parent checkbox state
  const labelChildren = [settings.showLabels, settings.showValues, settings.showFlowLabels, settings.showStageLabels];
  const allLabelsOn = labelChildren.every(Boolean);
  const allLabelsOff = labelChildren.every((v) => !v);
  const labelsIndeterminate = !allLabelsOn && !allLabelsOff;

  const handleAllLabelsToggle = (checked: boolean): void => {
    onBatchSettingChange({
      showLabels: checked,
      showValues: checked,
      showFlowLabels: checked,
      showStageLabels: checked,
    });
  };

  const hasNodeColorOverrides = (() => {
    try {
      const parsed: unknown = JSON.parse(settings.nodeColorOverrides);
      return parsed && typeof parsed === "object" && Object.keys(parsed as Record<string, unknown>).length > 0;
    } catch { return false; }
  })();

  const anyLabelShown = settings.showLabels || settings.showValues || settings.showFlowLabels || settings.showStageLabels;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="cp-backdrop" onClick={onClose} />}

      {/* Panel */}
      <div className={`cp-panel${isOpen ? " cp-panel-open" : ""}`}>
        {/* Header */}
        <div className="cp-header">
          <span className="cp-header-title">Configuration</span>
          <button className="cp-close-btn" onClick={onClose} type="button" title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="cp-content">
          {/* Chart Type */}
          <AccordionSection title="Chart Type" isOpen={openSections.has("chartType")} onToggle={() => toggleSection("chartType")}>
            <RadioGroup
              label="Sankey Type"
              name="sankeyType"
              value={settings.sankeyType}
              onChange={(v) => onSettingChange("sankeyType", v as ExtensionSettings["sankeyType"])}
              options={SANKEY_TYPE_OPTIONS}
            />
          </AccordionSection>

          {/* Nodes */}
          <AccordionSection title="Nodes" isOpen={openSections.has("nodes")} onToggle={() => toggleSection("nodes")}>
            {/* Colors */}
            <AccordionSection nested title="Colors" isOpen={openSections.has("nodes.colors")} onToggle={() => toggleSection("nodes.colors")}>
              <RadioGroup
                label="Color scheme"
                name="colorScheme"
                value={settings.colorScheme}
                onChange={(v) => onSettingChange("colorScheme", v as ExtensionSettings["colorScheme"])}
                options={COLOR_SCHEME_OPTIONS}
                renderExtra={(v) => {
                  if (v === "custom") return (
                    <CustomPaletteEditor
                      colorsJson={settings.customColors}
                      onChange={(json) => onSettingChange("customColors", json)}
                    />
                  );
                  if (v === "perStage") return (
                    <StagePaletteEditor
                      palettesJson={settings.stagePalettes}
                      onChange={(json) => onSettingChange("stagePalettes", json)}
                    />
                  );
                  return null;
                }}
              />

              <CheckboxOption
                label="Override individual node colors"
                description="Pick custom colors for specific nodes"
                checked={settings.enableNodeColorOverrides}
                onChange={(v) => onSettingChange("enableNodeColorOverrides", v)}
              />
              {settings.enableNodeColorOverrides && (
                <>
                  {!hasNodeColorOverrides && (
                    <div className="cp-help-text" style={{ marginBottom: 8 }}>
                      No overrides yet. Click any node on the chart to pick its color.
                    </div>
                  )}
                  <NodeColorEditor
                    overridesJson={settings.nodeColorOverrides}
                    onChange={(json) => onSettingChange("nodeColorOverrides", json)}
                  />
                </>
              )}

              {settings.sankeyType === "dropoff" && (
                <>
                  <RadioGroup
                    label="Drop-off node colors"
                    name="dropoffColorMode"
                    value={settings.dropoffColorMode}
                    onChange={(v) => onSettingChange("dropoffColorMode", v as ExtensionSettings["dropoffColorMode"])}
                    options={DROPOFF_COLOR_OPTIONS}
                  />
                  <CheckboxOption
                    label="Override individual drop-off colors"
                    description="Pick custom colors for specific drop-off nodes"
                    checked={settings.enableDropoffColorOverrides}
                    onChange={(v) => onSettingChange("enableDropoffColorOverrides", v)}
                  />
                  {settings.enableDropoffColorOverrides && (
                    <NodeColorEditor
                      overridesJson={settings.dropoffNodeColors}
                      onChange={(json) => onSettingChange("dropoffNodeColors", json)}
                    />
                  )}
                </>
              )}
            </AccordionSection>

            {/* Layout */}
            <AccordionSection nested title="Layout" isOpen={openSections.has("nodes.layout")} onToggle={() => toggleSection("nodes.layout")}>
              <RadioGroup
                label="Distribution"
                name="nodeAlignment"
                value={settings.nodeAlignment}
                onChange={(v) => onSettingChange("nodeAlignment", v as ExtensionSettings["nodeAlignment"])}
                options={NODE_ALIGNMENT_OPTIONS}
              />
              <RadioGroup
                label="Sort order"
                name="nodeSort"
                value={settings.nodeSort}
                onChange={(v) => onSettingChange("nodeSort", v as ExtensionSettings["nodeSort"])}
                options={NODE_SORT_OPTIONS}
              />
              <CheckboxOption
                label="Drag to reorder"
                description="Drag nodes up or down to override the sort order"
                checked={settings.enableDrag}
                onChange={(v) => onSettingChange("enableDrag", v)}
              />
              {settings.enableDrag && (() => {
                let savedOrder: Record<string, string[]> = {};
                try {
                  const parsed: unknown = JSON.parse(settings.nodePositions);
                  if (parsed && typeof parsed === "object") savedOrder = parsed as Record<string, string[]>;
                } catch { /* fallback */ }
                const columnCount = Object.keys(savedOrder).length;
                if (columnCount === 0) return (
                  <div className="cp-help-text" style={{ marginLeft: 24, marginBottom: 12 }}>
                    No manual overrides yet. Drag nodes on the chart to reorder them.
                  </div>
                );
                return (
                  <div style={{ marginLeft: 24, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="cp-help-text" style={{ margin: 0 }}>
                      Custom order set for {columnCount} column{columnCount === 1 ? "" : "s"}
                    </div>
                    <button
                      onClick={() => onSettingChange("nodePositions", "{}")}
                      className="cp-btn cp-btn-secondary"
                      style={{ padding: "4px 12px", minWidth: "auto", fontSize: 12 }}
                    >
                      Reset
                    </button>
                  </div>
                );
              })()}
              <SliderOption
                label="Spacing"
                description="Vertical gap between nodes in the same column"
                value={settings.nodePadding}
                min={NODE_PADDING_MIN}
                max={NODE_PADDING_MAX}
                onChange={(v) => onSettingChange("nodePadding", v)}
              />
              <SliderOption
                label="Width"
                description="Horizontal width of each node rectangle"
                value={settings.nodeWidth}
                min={NODE_WIDTH_MIN}
                max={NODE_WIDTH_MAX}
                onChange={(v) => onSettingChange("nodeWidth", v)}
              />
            </AccordionSection>

            {/* Labels */}
            <AccordionSection nested title="Labels" isOpen={openSections.has("nodes.labels")} onToggle={() => toggleSection("nodes.labels")}>
              <CheckboxOption
                label="Show node names"
                description="Text labels on each node"
                checked={settings.showLabels}
                onChange={(v) => onSettingChange("showLabels", v)}
              />
              {settings.showLabels && (
                <div style={{ marginLeft: 20 }}>
                  <RadioGroup
                    label="Label position"
                    name="labelPosition"
                    value={settings.labelPosition}
                    onChange={(v) => onSettingChange("labelPosition", v as ExtensionSettings["labelPosition"])}
                    options={LABEL_POSITION_OPTIONS}
                    renderExtra={(v) => v === "inside" ? (
                      <div style={{ marginLeft: 24, marginBottom: 8 }}>
                        <RadioGroup
                          label="Horizontal Alignment"
                          name="labelAlign"
                          value={settings.labelAlign}
                          onChange={(v) => onSettingChange("labelAlign", v as ExtensionSettings["labelAlign"])}
                          options={LABEL_ALIGN_OPTIONS}
                        />
                        <RadioGroup
                          label="Vertical Alignment"
                          name="labelVerticalAlign"
                          value={settings.labelVerticalAlign}
                          onChange={(v) => onSettingChange("labelVerticalAlign", v as ExtensionSettings["labelVerticalAlign"])}
                          options={LABEL_VERTICAL_ALIGN_OPTIONS}
                        />
                      </div>
                    ) : null}
                  />
                </div>
              )}
              <CheckboxOption
                label="Show node values"
                description="Numeric values below node names"
                checked={settings.showValues}
                onChange={(v) => onSettingChange("showValues", v)}
              />
              <CheckboxOption
                label="Show stage names"
                description="Column headers at the top of the chart"
                checked={settings.showStageLabels}
                onChange={(v) => onSettingChange("showStageLabels", v)}
              />
            </AccordionSection>

            {/* Data */}
            <CheckboxOption
              label="Ignore empty values"
              description={settings.sankeyType === "dropoff"
                ? "Always on in drop-off mode"
                : "Skip rows where any stage field is null or empty"}
              checked={settings.sankeyType === "dropoff" ? true : settings.ignoreNulls}
              disabled={settings.sankeyType === "dropoff"}
              onChange={(v) => {
                if (settings.sankeyType !== "dropoff") onSettingChange("ignoreNulls", v);
              }}
            />
          </AccordionSection>

          {/* Flows */}
          <AccordionSection title="Flows" isOpen={openSections.has("flows")} onToggle={() => toggleSection("flows")}>
            <RadioGroup
              label="Color"
              name="flowStyle"
              value={settings.flowStyle}
              onChange={(v) => onSettingChange("flowStyle", v as ExtensionSettings["flowStyle"])}
              options={FLOW_STYLE_OPTIONS}
            />
            <SliderOption
              label="Opacity"
              description="Drag left for more opaque, right for more transparent"
              value={settings.flowOpacity}
              min={0.05}
              max={1}
              step={0.05}
              reversed
              onChange={(v) => onSettingChange("flowOpacity", v)}
            />
            <SliderOption
              label="Gap"
              description="Horizontal gap between nodes and flow connection points"
              value={settings.flowGap}
              min={0}
              max={20}
              onChange={(v) => onSettingChange("flowGap", v)}
            />
            <CheckboxOption
              label="Merge duplicate flows"
              description="Combine flows connecting the same two nodes into a single flow"
              checked={settings.aggregateFlows}
              onChange={(v) => onSettingChange("aggregateFlows", v)}
            />
            <CheckboxOption
              label="Show flow values"
              description="Values along flow paths (only on wide flows)"
              checked={settings.showFlowLabels}
              onChange={(v) => onSettingChange("showFlowLabels", v)}
            />
          </AccordionSection>

          {/* Tooltips */}
          <AccordionSection title="Tooltips" isOpen={openSections.has("tooltips")} onToggle={() => toggleSection("tooltips")}>
            <CheckboxOption
              label="Show tooltips"
              description="Show value and percentage when hovering over flows or nodes"
              checked={settings.showPercentages}
              onChange={(v) => onSettingChange("showPercentages", v)}
            />
            <CheckboxOption
              label="Show Tableau tooltip"
              description="Also show Tableau's native tooltip"
              checked={settings.showTableauTooltip}
              onChange={(v) => onSettingChange("showTableauTooltip", v)}
            />
            {settings.showPercentages && !settings.showTableauTooltip && (
              <RadioGroup
                label="Tooltip Style"
                name="tooltipMode"
                value={settings.tooltipMode}
                onChange={(v) => onSettingChange("tooltipMode", v as ExtensionSettings["tooltipMode"])}
                options={TOOLTIP_MODE_OPTIONS}
                renderExtra={(v) => v === "custom" ? (
                  <div className="cp-form-group" style={{ marginLeft: 28, marginTop: 8 }}>
                    <textarea
                      className="cp-template-textarea"
                      value={settings.tooltipTemplate}
                      onChange={(e) => onSettingChange("tooltipTemplate", e.target.value)}
                      rows={4}
                    />
                    <div className="cp-help-text" style={{ marginLeft: 0 }}>
                      Placeholders: {"{name}"}, {"{value}"}, {"{percentage}"}, {"{source}"}, {"{target}"}, {"{level}"}
                    </div>
                  </div>
                ) : null}
              />
            )}
          </AccordionSection>

          {/* Fonts */}
          {anyLabelShown && (
            <AccordionSection title="Fonts" isOpen={openSections.has("fonts")} onToggle={() => toggleSection("fonts")}>
              <CheckboxOption
                label="Override Tableau font"
                description="Set custom size and weight per label type"
                checked={settings.useCustomLabelFont}
                onChange={(v) => onSettingChange("useCustomLabelFont", v)}
              />
              {settings.useCustomLabelFont && (
                <div style={{ marginLeft: 20 }}>
                  {settings.showLabels && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="cp-radio-group-label">Node names</div>
                      <SliderOption label="Font size" description="" value={settings.labelFontSize} min={8} max={24} onChange={(v) => onSettingChange("labelFontSize", v)} />
                      <CheckboxOption label="Bold" description="" checked={settings.labelFontWeight === "bold"} onChange={(v) => onSettingChange("labelFontWeight", v ? "bold" : "normal")} />
                    </div>
                  )}
                  {settings.showValues && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="cp-radio-group-label">Node values</div>
                      <SliderOption label="Font size" description="" value={settings.valueLabelFontSize} min={8} max={24} onChange={(v) => onSettingChange("valueLabelFontSize", v)} />
                      <CheckboxOption label="Bold" description="" checked={settings.valueLabelFontWeight === "bold"} onChange={(v) => onSettingChange("valueLabelFontWeight", v ? "bold" : "normal")} />
                    </div>
                  )}
                  {settings.showFlowLabels && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="cp-radio-group-label">Flow values</div>
                      <SliderOption label="Font size" description="" value={settings.flowLabelFontSize} min={8} max={24} onChange={(v) => onSettingChange("flowLabelFontSize", v)} />
                      <CheckboxOption label="Bold" description="" checked={settings.flowLabelFontWeight === "bold"} onChange={(v) => onSettingChange("flowLabelFontWeight", v ? "bold" : "normal")} />
                    </div>
                  )}
                  {settings.showStageLabels && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="cp-radio-group-label">Stage names</div>
                      <SliderOption label="Font size" description="" value={settings.stageLabelFontSize} min={8} max={24} onChange={(v) => onSettingChange("stageLabelFontSize", v)} />
                      <CheckboxOption label="Bold" description="" checked={settings.stageLabelFontWeight === "bold"} onChange={(v) => onSettingChange("stageLabelFontWeight", v ? "bold" : "normal")} />
                    </div>
                  )}
                </div>
              )}
            </AccordionSection>
          )}
        </div>
      </div>
    </>
  );
};

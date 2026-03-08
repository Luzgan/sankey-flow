// Layout
export const X_PADDING = 2;
export const Y_PADDING = 1;
export const LEVEL_WIDTH = 100;
export const TOP_MARGIN = 20;
export const LABEL_MARGIN = 80;

// Links
export const LINK_OPACITY = 0.5;
export const LINK_SELECTED_OPACITY = 0.7;
export const LINK_FOGGED_OPACITY = 0.15;

// Nodes
export const NODE_BORDER_COLOR = "#000";
export const NODE_BORDER_WIDTH = 1;
export const SELECTION_BLEND_FACTOR = 0.3;

// Data
export const DATA_PAGE_SIZE = 100;

// Labels
export const LABEL_PADDING = 6;
export const MIN_NODE_HEIGHT_FOR_VALUE = 30;
export const LABEL_FONT_SIZE_DEFAULT = 12;
export const LABEL_FONT_SIZE_MIN = 9;
export const LABEL_COLLISION_PADDING = 2;

// Tooltip
export const TOOLTIP_OFFSET_X = 12;
export const TOOLTIP_OFFSET_Y = -28;

// Layout slider ranges
export const NODE_PADDING_MIN = 1;
export const NODE_PADDING_MAX = 60;
export const NODE_PADDING_DEFAULT = 1;
export const NODE_WIDTH_MIN = 10;
export const NODE_WIDTH_MAX = 200;
export const NODE_WIDTH_DEFAULT = LEVEL_WIDTH + X_PADDING * 2;

// Link labels
export const LINK_LABEL_MIN_WIDTH = 15;

// Tooltip
export const TOOLTIP_MODE_MINIMAL = "minimal" as const;
export const TOOLTIP_MODE_DETAILED = "detailed" as const;
export const TOOLTIP_MODE_CUSTOM = "custom" as const;

// Null handling
export const NULL_DISPLAY_NAME = "(empty)";

// Export button
export const EXPORT_BUTTON_SIZE = 28;
export const EXPORT_BUTTON_MARGIN = 8;

export interface ExtensionSettings {
  colorScheme: "default" | "colorblind" | "monochrome" | "custom";
  linkStyle: "gradient" | "source" | "target";
  showValues: boolean;
  showPercentages: boolean;
  nodeAlignment: "justify" | "left" | "right" | "center";
  labelPosition: "auto" | "inside" | "outside";
  nodeSort: "auto" | "ascending" | "descending" | "alphabetical";
  aggregateLinks: boolean;
  customColors: string;
  // Step 1: Layout sliders
  nodePadding: number;
  nodeWidth: number;
  // Step 2: Ignore nulls
  ignoreNulls: boolean;
  // Step 3: Tooltip modes
  tooltipMode: "minimal" | "detailed" | "custom";
  tooltipTemplate: string;
  // Step 5: Label alignment within node
  labelAlign: "left" | "center" | "right";
  labelVerticalAlign: "top" | "middle" | "bottom";
  // Step 6: Labels on links
  showLinkLabels: boolean;
  // Step 8: Onboarding
  onboardingSeen: boolean;
  // Step 9: Legend
  showLegend: boolean;
  legendPosition: "bottom" | "right";
  // Step 11: Draggable nodes
  enableDrag: boolean;
  nodePositions: string;
  // Step 12: Filter connected nodes
  clickAction: "select" | "filter" | "filterConnected";
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  colorScheme: "default",
  linkStyle: "gradient",
  showValues: true,
  showPercentages: true,
  nodeAlignment: "justify",
  labelPosition: "auto",
  nodeSort: "auto",
  aggregateLinks: true,
  customColors: '["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]',
  nodePadding: NODE_PADDING_DEFAULT,
  nodeWidth: NODE_WIDTH_DEFAULT,
  ignoreNulls: true,
  tooltipMode: "detailed",
  tooltipTemplate: "<b>{name}</b><br>{value} ({percentage}%)<br>Source: {source} → Target: {target}",
  labelAlign: "center",
  labelVerticalAlign: "middle",
  showLinkLabels: false,
  onboardingSeen: false,
  showLegend: false,
  legendPosition: "bottom",
  enableDrag: false,
  nodePositions: "{}",
  clickAction: "select",
};

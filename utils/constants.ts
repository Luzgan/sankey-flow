// Layout
export const X_PADDING = 2;
export const Y_PADDING = 1;
export const STAGE_WIDTH = 100;
export const TOP_MARGIN = 20;

// Flows
export const FLOW_OPACITY = 0.5;
export const FLOW_SELECTED_OPACITY = 0.7;
export const FLOW_FOGGED_OPACITY = 0.15;

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
export const LABEL_MARGIN_RATIO = 0.12;
export const LABEL_MARGIN_MIN = 60;
export const LABEL_MARGIN_MAX = 160;

// Tooltip
export const TOOLTIP_OFFSET_X = 12;
export const TOOLTIP_OFFSET_Y = -28;

// Layout slider ranges
export const NODE_PADDING_MIN = 1;
export const NODE_PADDING_MAX = 60;
export const NODE_PADDING_DEFAULT = 1;
export const NODE_WIDTH_MIN = 10;
export const NODE_WIDTH_MAX = 200;
export const NODE_WIDTH_DEFAULT = STAGE_WIDTH + X_PADDING * 2;

// Flow labels
export const FLOW_LABEL_MIN_WIDTH = 15;

// Null handling
export const NULL_DISPLAY_NAME = "(empty)";

// Drop-off visualization
export const DROPOFF_COLOR = "#e15759";
export const DROPOFF_OPACITY = 0.3;
export const DROPOFF_CURVE_HEIGHT = 60;
export const DROPOFF_LABEL_FONT_SIZE = 10;
export const BOTTOM_MARGIN = 30;

// Export button
export const EXPORT_BUTTON_SIZE = 28;
export const EXPORT_BUTTON_MARGIN = 8;

export interface ExtensionSettings {
  colorScheme: "default" | "colorblind" | "monochrome" | "custom" | "perStage";
  flowStyle: "gradient" | "source" | "target";
  showValues: boolean;
  showPercentages: boolean;
  nodeAlignment: "justify" | "left" | "right" | "center";
  labelPosition: "auto" | "inside" | "outside";
  nodeSort: "auto" | "ascending" | "descending" | "alphabetical";
  aggregateFlows: boolean;
  customColors: string;
  nodePadding: number;
  nodeWidth: number;
  ignoreNulls: boolean;
  tooltipMode: "minimal" | "detailed" | "custom";
  tooltipTemplate: string;
  showTableauTooltip: boolean;
  labelAlign: "left" | "center" | "right";
  labelVerticalAlign: "top" | "middle" | "bottom";
  showFlowLabels: boolean;
  onboardingSeen: boolean;
  enableDrag: boolean;
  nodePositions: string;
  enableNodeColorOverrides: boolean;
  nodeColorOverrides: string;
  stagePalettes: string;
  sankeyType: "standard" | "dropoff";
  dropoffColorMode: "default" | "perNode";
  dropoffNodeColors: string;
  flowOpacity: number;
  flowGap: number;
  showLabels: boolean;
  showStageLabels: boolean;
  useCustomLabelFont: boolean;
  labelFontSize: number;
  labelFontWeight: "normal" | "bold";
  flowLabelFontSize: number;
  flowLabelFontWeight: "normal" | "bold";
  valueLabelFontSize: number;
  valueLabelFontWeight: "normal" | "bold";
  stageLabelFontSize: number;
  stageLabelFontWeight: "normal" | "bold";
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  colorScheme: "default",
  flowStyle: "gradient",
  showValues: true,
  showPercentages: true,
  nodeAlignment: "justify",
  labelPosition: "auto",
  nodeSort: "auto",
  aggregateFlows: true,
  customColors: '["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]',
  nodePadding: NODE_PADDING_DEFAULT,
  nodeWidth: NODE_WIDTH_DEFAULT,
  ignoreNulls: true,
  tooltipMode: "detailed",
  tooltipTemplate: "<b>{name}</b><br>{value} ({percentage}%)<br>Source: {source} → Target: {target}",
  showTableauTooltip: false,
  labelAlign: "center",
  labelVerticalAlign: "middle",
  showFlowLabels: false,
  onboardingSeen: false,
  enableDrag: false,
  nodePositions: "{}",
  enableNodeColorOverrides: false,
  nodeColorOverrides: "{}",
  stagePalettes: "{}",
  sankeyType: "standard",
  dropoffColorMode: "default",
  dropoffNodeColors: "{}",
  flowOpacity: 0.5,
  flowGap: 0,
  showLabels: true,
  showStageLabels: true,
  useCustomLabelFont: false,
  labelFontSize: LABEL_FONT_SIZE_DEFAULT,
  labelFontWeight: "normal",
  flowLabelFontSize: LABEL_FONT_SIZE_DEFAULT,
  flowLabelFontWeight: "normal",
  valueLabelFontSize: LABEL_FONT_SIZE_DEFAULT,
  valueLabelFontWeight: "normal",
  stageLabelFontSize: 14,
  stageLabelFontWeight: "bold",
};

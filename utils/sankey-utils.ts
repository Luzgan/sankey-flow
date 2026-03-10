import * as d3 from "d3";
import {
  sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
} from "d3-sankey";
import { Field } from "@tableau/extensions-api-types";
import { EncodingMap, RowData } from "./tableau-utils";
import { isAuthoringMode, TableauSettings } from "./tableau-api-utils";
import { getColor, getGradientId, getContrastingLabelColor } from "./color-utils";
import {
  getSelectedNodes,
  getFlowsPerTupleId,
  renderSelection,
} from "./interaction-utils";
import {
  X_PADDING,
  Y_PADDING,
  TOP_MARGIN,
  LABEL_MARGIN_RATIO,
  LABEL_MARGIN_MIN,
  LABEL_MARGIN_MAX,
  FLOW_OPACITY,
  NODE_BORDER_COLOR,
  NODE_BORDER_WIDTH,
  LABEL_PADDING,
  MIN_NODE_HEIGHT_FOR_VALUE,
  LABEL_FONT_SIZE_DEFAULT,
  LABEL_FONT_SIZE_MIN,
  LABEL_COLLISION_PADDING,
  NULL_DISPLAY_NAME,
  FLOW_LABEL_MIN_WIDTH,
  DROPOFF_COLOR,
  BOTTOM_MARGIN,
  ExtensionSettings,
} from "./constants";

/** Tableau represents null field values in various ways — detect all known sentinels */
function isNullValue(raw: string): boolean {
  if (!raw) return true;
  const lower = raw.toLowerCase().trim();
  return lower === "null" || lower === "%null%" || lower === "undefined";
}

export interface SankeyNode {
  id: string;
  name: string;
  layer: number;
  color: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
  value?: number;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
}

export interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  tupleId: number;
  tupleIds?: number[];
  /** Detail field values for this flow (fields not in level/edge encodings) */
  detailValues?: Record<string, string>;
  width?: number;
  y0?: number;
  y1?: number;
}

export interface EncodedData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  warnings?: string[];
}

// Color palettes for different schemes
export const colorPalettes: Record<string, string[]> = {
  default: [
    "#4e79a7",
    "#f28e2c",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc949",
    "#af7aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ab",
  ],
  colorblind: [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ],
  monochrome: [
    "#2c3e50",
    "#34495e",
    "#7f8c8d",
    "#95a5a6",
    "#bdc3c7",
    "#d5dbdb",
    "#ecf0f1",
    "#f8f9fa",
    "#e8e8e8",
    "#d0d0d0",
  ],
};

export const palette = colorPalettes.default;

const NODE_ALIGNMENT_MAP: Record<
  string,
  (node: any, n: number) => number
> = {
  justify: sankeyJustify,
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
};

/**
 * Main Sankey visualization function
 */
export async function Sankey(
  encodedData: EncodedData,
  encodingMap: EncodingMap,
  width: number,
  height: number,
  selectedTupleIds: Map<number, boolean>,
  styles: any,
  settings: ExtensionSettings
): Promise<{
  hoveringLayer: any;
  flowsPerTupleId: Map<number, any[]>;
  viz: SVGElement;
  totalFlowValue: number;
  layoutFlows: SankeyLink[];
  layoutNodes: SankeyNode[];
}> {
  const layout = computeSankeyLayout(
    sankey,
    encodedData,
    TOP_MARGIN,
    width,
    height,
    settings.nodeWidth,
    settings.nodePadding,
    settings
  );

  const totalFlowValue = layout.links.reduce(
    (sum: number, l: SankeyLink) => sum + l.value,
    0
  );

  const maxLayer = layout.nodes.length > 0
    ? Math.max(...layout.nodes.map((n: SankeyNode) => n.layer))
    : 0;

  const selectedNodeIndexes = getSelectedNodes(layout.links, selectedTupleIds);

  // Create SVG container
  const svg = d3
    .create("svg")
    .attr("class", tableau.ClassNameKey.Worksheet)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("role", "img")
    .attr(
      "aria-label",
      `Sankey diagram with ${layout.nodes.length} nodes across ${maxLayer + 1} stages showing flow values`
    );

  // Apply workbook formatting from Tableau's cssProperties API.
  // Properties are standard React.CSSProperties names (fontFamily, fontSize, etc.).
  // Applied via .style() (CSS) so they inherit to all text elements.
  // SVG <text> uses `fill` for color, not CSS `color`.
  if (styles) {
    if (styles.fontFamily) svg.style("font-family", styles.fontFamily);
    if (styles.fontSize) svg.style("font-size", styles.fontSize);
    if (styles.fontWeight) svg.style("font-weight", styles.fontWeight);
    if (styles.fontStyle) svg.style("font-style", styles.fontStyle);
    if (styles.textDecoration) svg.style("text-decoration", styles.textDecoration);
    if (styles.color) svg.style("fill", styles.color);
  }

  // Add gradient definitions for gradient flow style
  if (settings.flowStyle === "gradient") {
    const defs = svg.append("defs");
    const gradientIds = new Set<string>();

    layout.links.forEach((link: SankeyLink) => {
      const source = link.source as SankeyNode;
      const target = link.target as SankeyNode;
      const gradId = getGradientId(source.id, target.id);

      if (gradientIds.has(gradId)) return;
      gradientIds.add(gradId);

      const gradient = defs
        .append("linearGradient")
        .attr("id", gradId)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", source.x1 || 0)
        .attr("x2", target.x0 || 0);

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", source.color);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", target.color);
    });
  }

  // Create node rects
  svg
    .append("g")
    .selectAll()
    .data(layout.nodes)
    .join("rect")
    .attr("class", "node")
    .attr("x", (d: SankeyNode) => (d.x0 || 0) + X_PADDING)
    .attr("y", (d: SankeyNode) => d.y0 || 0)
    .attr("height", (d: SankeyNode) => (d.y1 || 0) - (d.y0 || 0))
    .attr(
      "width",
      (d: SankeyNode) => (d.x1 || 0) - (d.x0 || 0) - X_PADDING * 2
    )
    .attr("fill", (d: SankeyNode, index: number) =>
      getColor(d.color, selectedTupleIds, selectedNodeIndexes.has(index))
    )
    .attr("stroke", NODE_BORDER_COLOR)
    .attr("stroke-width", NODE_BORDER_WIDTH);

  // Apply snap-drag behavior if enabled and in authoring mode
  if (settings.enableDrag && isAuthoringMode()) {
    const nodeRects = svg.selectAll<SVGRectElement, SankeyNode>(".node");
    const flowPaths = () => svg.selectAll<SVGPathElement, SankeyLink>(".flow");
    const allNodes = layout.nodes as SankeyNode[];

    const flowPathAccessor = (d: SankeyLink): string => getFlowPath(d, settings.flowGap);

    const updatePositions = (): void => {
      // Update all node rects (position + height), labels, and flow paths
      nodeRects
        .attr("y", (n: SankeyNode) => n.y0 || 0)
        .attr("height", (n: SankeyNode) => (n.y1 || 0) - (n.y0 || 0));
      svg.selectAll<SVGTextElement, SankeyNode>(".node-label")
        .attr("y", (n: SankeyNode) => ((n.y0 || 0) + (n.y1 || 0)) / 2);
      flowPaths().attr("d", flowPathAccessor);
      if (settings.showFlowLabels) {
        svg.selectAll<SVGTextElement, SankeyLink>(".flow-label")
          .attr("y", (ld: SankeyLink) => ((ld.y0 || 0) + (ld.y1 || 0)) / 2);
      }
    };

    // Order-based drag: track the visual ordering of nodes in the layer.
    // On swap, recompute all y positions by stacking nodes with uniform gaps.
    let dragOrder: SankeyNode[] = [];
    let dragHomeIndex = -1;
    let layerTopY = 0;
    let layerGap = 0;
    // Store original heights by node id so they're never lost during recomputation
    const nodeHeights = new Map<string, number>();

    // Shift a node's connected flow y-positions by a delta
    const shiftNodeLinks = (node: SankeyNode, dy: number): void => {
      for (const link of (node.sourceLinks || [])) {
        link.y0 = (link.y0 || 0) + dy;
      }
      for (const link of (node.targetLinks || [])) {
        link.y1 = (link.y1 || 0) + dy;
      }
    };

    // Recompute y positions for all non-dragged nodes based on current dragOrder
    const recomputeLayerPositions = (draggedId: string): void => {
      let y = layerTopY;
      for (const node of dragOrder) {
        const h = nodeHeights.get(node.id) ?? ((node.y1 || 0) - (node.y0 || 0));
        if (node.id === draggedId) {
          // Reserve space for dragged node but don't reposition it
          y += h + layerGap;
          continue;
        }
        const oldY0 = node.y0 || 0;
        node.y0 = y;
        node.y1 = y + h;
        shiftNodeLinks(node, y - oldY0);
        y += h + layerGap;
      }
    };

    nodeRects.call(
      d3.drag<SVGRectElement, SankeyNode>()
        .on("start", function (_event: d3.D3DragEvent<SVGRectElement, SankeyNode, unknown>, d: SankeyNode) {
          d3.select(this).raise().attr("stroke-width", 2);

          // Snapshot the layer's node order, heights, and compute uniform gap
          dragOrder = allNodes
            .filter((n) => n.layer === d.layer)
            .sort((a, b) => (a.y0 || 0) - (b.y0 || 0));
          dragHomeIndex = dragOrder.indexOf(d);
          layerTopY = dragOrder[0].y0 || 0;

          // Lock in each node's height at drag start
          nodeHeights.clear();
          for (const n of dragOrder) {
            nodeHeights.set(n.id, (n.y1 || 0) - (n.y0 || 0));
          }

          const totalNodeHeight = dragOrder.reduce((sum, n) => sum + (nodeHeights.get(n.id) || 0), 0);
          const lastNode = dragOrder[dragOrder.length - 1];
          const layerSpan = (lastNode.y1 || 0) - layerTopY;
          layerGap = dragOrder.length > 1 ? (layerSpan - totalNodeHeight) / (dragOrder.length - 1) : 0;
        })
        .on("drag", function (event: d3.D3DragEvent<SVGRectElement, SankeyNode, unknown>, d: SankeyNode) {
          // Move dragged node visually (free Y, constrained to chart bounds)
          const dragH = nodeHeights.get(d.id) || ((d.y1 || 0) - (d.y0 || 0));
          const oldY0 = d.y0 || 0;
          const newY0 = Math.max(TOP_MARGIN, Math.min(height - BOTTOM_MARGIN - dragH, oldY0 + event.dy));
          d.y0 = newY0;
          d.y1 = newY0 + dragH;
          shiftNodeLinks(d, newY0 - oldY0);
          d3.select(this).attr("y", d.y0);

          // Update dragged node's label
          svg.selectAll<SVGTextElement, SankeyNode>(".node-label")
            .filter((nd: SankeyNode) => nd.id === d.id)
            .attr("y", (d.y0 + d.y1) / 2);

          // Swap when dragged node's top edge crosses above neighbor's midpoint (moving up)
          // or dragged node's bottom edge crosses below neighbor's midpoint (moving down).
          // Using edges instead of midpoint makes boundary swaps (first/last) reachable.
          let didSwap = false;

          // Check immediate neighbor above
          if (dragHomeIndex > 0) {
            const above = dragOrder[dragHomeIndex - 1];
            const aboveMid = ((above.y0 || 0) + (above.y1 || 0)) / 2;
            if (d.y0 < aboveMid) {
              dragOrder[dragHomeIndex] = above;
              dragOrder[dragHomeIndex - 1] = d;
              dragHomeIndex -= 1;
              didSwap = true;
            }
          }

          // Check immediate neighbor below
          if (!didSwap && dragHomeIndex < dragOrder.length - 1) {
            const below = dragOrder[dragHomeIndex + 1];
            const belowMid = ((below.y0 || 0) + (below.y1 || 0)) / 2;
            if (d.y1 > belowMid) {
              dragOrder[dragHomeIndex] = below;
              dragOrder[dragHomeIndex + 1] = d;
              dragHomeIndex += 1;
              didSwap = true;
            }
          }

          if (didSwap) {
            // Recompute all sibling positions from the new order
            recomputeLayerPositions(d.id);

            // Animate non-dragged nodes to their new positions + correct heights
            nodeRects.filter((n: SankeyNode) => n.id !== d.id && n.layer === d.layer)
              .transition().duration(150)
              .attr("y", (n: SankeyNode) => n.y0 || 0)
              .attr("height", (n: SankeyNode) => nodeHeights.get(n.id) ?? ((n.y1 || 0) - (n.y0 || 0)));
            svg.selectAll<SVGTextElement, SankeyNode>(".node-label")
              .filter((n: SankeyNode) => n.id !== d.id && n.layer === d.layer)
              .transition().duration(150)
              .attr("y", (n: SankeyNode) => ((n.y0 || 0) + (n.y1 || 0)) / 2);
          }

          // Update all flow paths (dragged node moved)
          flowPaths().attr("d", flowPathAccessor);
          if (settings.showFlowLabels) {
            svg.selectAll<SVGTextElement, SankeyLink>(".flow-label")
              .attr("y", (ld: SankeyLink) => ((ld.y0 || 0) + (ld.y1 || 0)) / 2);
          }
        })
        .on("end", function (_event: d3.D3DragEvent<SVGRectElement, SankeyNode, unknown>, d: SankeyNode) {
          d3.select(this).attr("stroke-width", NODE_BORDER_WIDTH);

          // Snap dragged node to its computed position in the order
          recomputeLayerPositions(""); // recompute all including dragged
          updatePositions();

          // Save the layer's node order
          const layerNodes = allNodes
            .filter((n) => n.layer === d.layer)
            .sort((a, b) => (a.y0 || 0) - (b.y0 || 0));

          let savedOrder: Record<string, string[]> = {};
          try {
            const parsed: unknown = JSON.parse(settings.nodePositions);
            if (parsed && typeof parsed === "object") savedOrder = parsed as Record<string, string[]>;
          } catch { /* fallback */ }
          savedOrder[String(d.layer)] = layerNodes.map((n) => n.id);
          const json = JSON.stringify(savedOrder);
          settings.nodePositions = json;

          window.__sankeyDragSaving = true;
          TableauSettings.set("nodePositions", json);
          TableauSettings.save().then(() => {
            setTimeout(() => { window.__sankeyDragSaving = false; }, 100);
          });
        })
    );
  }

  // Create flow paths
  const links = svg
    .append("g")
    .style("cursor", "pointer")
    .selectAll()
    .data(layout.links)
    .join("path")
    .attr("class", "flow")
    .attr("d", (d: SankeyLink) => getFlowPath(d, settings.flowGap))
    .attr("stroke", (d: SankeyLink) =>
      getFlowStroke(d, settings.flowStyle)
    )
    .style("stroke-opacity", (d: SankeyLink) =>
      getFlowOpacity(d, selectedTupleIds, settings.flowOpacity)
    )
    .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width || 1));

  // Add flow labels (Step 6)
  if (settings.showFlowLabels) {
    svg
      .append("g")
      .attr("class", "flow-labels")
      .attr("pointer-events", "none")
      .selectAll()
      .data(layout.links.filter((l: SankeyLink) => (l.width || 0) >= FLOW_LABEL_MIN_WIDTH))
      .join("text")
      .attr("class", "flow-label")
      .attr("x", (d: SankeyLink) => {
        const source = d.source as SankeyNode;
        const target = d.target as SankeyNode;
        return ((source.x1 || 0) + (target.x0 || 0)) / 2;
      })
      .attr("y", (d: SankeyLink) => {
        return ((d.y0 || 0) + (d.y1 || 0)) / 2;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .call((sel) => {
        if (settings.useCustomLabelFont) {
          sel.style("font-size", `${settings.flowLabelFontSize}px`)
            .style("font-weight", settings.flowLabelFontWeight);
        } else {
          sel.style("font-size", "0.85em");
        }
      })
      .attr("fill", styles?.color || "#555")
      .attr("fill-opacity", 0.8)
      .text((d: SankeyLink) => d.value.toLocaleString());
  }

  // Add node labels at natural positions (collision resolved post-render)
  if (settings.showLabels) {
    svg
      .append("g")
      .selectAll()
      .data(layout.nodes)
      .join("text")
      .attr("class", "node-label")
      .attr("x", (d: SankeyNode) =>
        getNodeLabelX(d, maxLayer, settings.labelPosition, settings.labelAlign)
      )
      .attr("y", (d: SankeyNode) => {
        if (settings.labelPosition === "inside") {
          const y0 = d.y0 || 0;
          const y1 = d.y1 || 0;
          if (settings.labelVerticalAlign === "top") return y0 + LABEL_PADDING;
          if (settings.labelVerticalAlign === "bottom") return y1 - LABEL_PADDING;
        }
        return ((d.y1 || 0) + (d.y0 || 0)) / 2;
      })
      .attr("dy", (d: SankeyNode) => {
        if (settings.labelPosition === "inside" && settings.labelVerticalAlign === "top") return "0.8em";
        if (settings.labelPosition === "inside" && settings.labelVerticalAlign === "bottom") return "-0.3em";
        const nodeHeight = (d.y1 || 0) - (d.y0 || 0);
        const hasValue = settings.showValues && nodeHeight >= MIN_NODE_HEIGHT_FOR_VALUE;
        return hasValue ? "-0.1em" : "0.35em";
      })
      .attr("text-anchor", (d: SankeyNode) =>
        getNodeLabelAnchor(d, maxLayer, settings.labelPosition, settings.labelAlign)
      )
      .call((sel) => {
        if (settings.useCustomLabelFont) {
          sel.attr("font-size", `${settings.labelFontSize}px`)
            .attr("font-weight", settings.labelFontWeight);
        }
      })
      .text((d: SankeyNode) => d.name)
      .attr("fill", (d: SankeyNode, index: number) => {
        const baseColor = isLabelOnNode(d, maxLayer, settings.labelPosition)
          ? getContrastingLabelColor(d.color)
          : "black";
        return getColor(baseColor, selectedTupleIds, selectedNodeIndexes.has(index));
      })
      .each(function (this: SVGTextElement | null, d: SankeyNode) {
        if (!this) return;

        // Truncate labels that exceed available space
        if (isLabelOnNode(d, maxLayer, settings.labelPosition)) {
          const nodeWidth = (d.x1 || 0) - (d.x0 || 0);
          const maxLabelWidth = nodeWidth - LABEL_PADDING * 2;
          truncateLabel(this, d.name, maxLabelWidth);
        } else {
          const outsideMargin = Math.min(
            LABEL_MARGIN_MAX,
            Math.max(LABEL_MARGIN_MIN, Math.round(width * LABEL_MARGIN_RATIO))
          );
          const maxLabelWidth = outsideMargin - LABEL_PADDING * 2;
          truncateLabel(this, d.name, maxLabelWidth);
        }

        const nodeHeight = (d.y1 || 0) - (d.y0 || 0);
        if (!settings.showValues || nodeHeight < MIN_NODE_HEIGHT_FOR_VALUE) return;

        const nodeValue = d.value || 0;
        d3.select(this)
          .append("tspan")
          .attr(
            "x",
            getNodeLabelX(d, maxLayer, settings.labelPosition, settings.labelAlign)
          )
          .attr("dy", "1.2em")
          .call((tspan) => {
            if (settings.useCustomLabelFont) {
              tspan.style("font-size", `${settings.valueLabelFontSize}px`)
                .style("font-weight", settings.valueLabelFontWeight);
            } else {
              tspan.style("font-size", "0.85em");
            }
          })
          .attr("fill-opacity", 0.7)
          .text(nodeValue.toLocaleString());
      });
  }

  // Add top labels for stages
  if (encodingMap.level && settings.showStageLabels) {
    const stages: (SankeyNode | undefined)[] = [];
    for (const node of layout.nodes) {
      stages[node.layer] = node;
    }

    svg
      .append("g")
      .selectAll()
      .data(stages.filter(Boolean))
      .join("text")
      .attr("class", "stage-label")
      .attr("x", (d: SankeyNode | undefined) =>
        d ? ((d.x1 || 0) + (d.x0 || 0)) / 2 : 0
      )
      .attr("y", TOP_MARGIN / 2)
      .attr("text-anchor", "middle")
      .call((sel) => {
        if (settings.useCustomLabelFont) {
          sel.style("font-size", `${settings.stageLabelFontSize}px`)
            .style("font-weight", settings.stageLabelFontWeight);
        }
      })
      .text((d: SankeyNode | undefined) =>
        d ? encodingMap.level![d.layer].name : ""
      )
      .attr("fill", styles?.color || styles?.["color"] || "#333");
  }

  // Selection and hovering layers (decorative)
  const selectionLayer = svg.append("g").attr("aria-hidden", "true");
  const hoveringLayer = svg.append("g").attr("aria-hidden", "true");

  const flowsPerTupleId = getFlowsPerTupleId(links);

  renderSelection(
    selectedTupleIds,
    flowsPerTupleId,
    selectionLayer,
    hoveringLayer
  );

  return {
    hoveringLayer,
    flowsPerTupleId,
    viz: svg.node()!,
    totalFlowValue,
    layoutFlows: layout.links,
    layoutNodes: layout.nodes,
  };
}

/**
 * Get flow stroke color or gradient URL
 */
function getFlowStroke(link: SankeyLink, flowStyle: string): string {
  const source = link.source as SankeyNode;
  const target = link.target as SankeyNode;

  switch (flowStyle) {
    case "gradient":
      return `url(#${getGradientId(source.id, target.id)})`;
    case "target":
      return target.color;
    case "source":
    default:
      return source.color;
  }
}

/**
 * Truncate an SVG text element to fit within maxWidth, adding ellipsis if needed.
 * Uses getComputedTextLength() for accurate measurement.
 */
function truncateLabel(
  textEl: SVGTextElement,
  fullText: string,
  maxWidth: number
): void {
  if (textEl.getComputedTextLength() <= maxWidth) return;

  let truncated = fullText;
  while (truncated.length > 1 && textEl.getComputedTextLength() > maxWidth) {
    truncated = truncated.slice(0, -1);
    textEl.textContent = `${truncated}\u2026`;
  }
}

/**
 * Get flow opacity based on selection state and user-configured base opacity
 */
function getFlowOpacity(
  link: SankeyLink,
  selectedTupleIds: Map<number, boolean>,
  baseOpacity: number = FLOW_OPACITY
): number {
  if (selectedTupleIds.size === 0) return baseOpacity;

  const ids = link.tupleIds || [link.tupleId];
  const isSelected = ids.some((id) => selectedTupleIds.has(id));
  const selectedOpacity = Math.min(1, baseOpacity + 0.2);
  const foggedOpacity = Math.max(0.05, baseOpacity * 0.3);
  return isSelected ? selectedOpacity : foggedOpacity;
}

/**
 * Get node label X position based on layer and label position setting
 */
function getNodeLabelX(
  node: SankeyNode,
  maxLayer: number,
  labelPosition: string,
  labelAlign = "center"
): number {
  const midX = ((node.x1 || 0) + (node.x0 || 0)) / 2;

  if (labelPosition === "inside") {
    if (labelAlign === "left") return (node.x0 || 0) + X_PADDING + LABEL_PADDING;
    if (labelAlign === "right") return (node.x1 || 0) - X_PADDING - LABEL_PADDING;
    return midX;
  }

  // "auto" and "outside" use the same adaptive logic
  if (node.layer === 0) return (node.x0 || 0) - LABEL_PADDING;
  if (node.layer === maxLayer) return (node.x1 || 0) + LABEL_PADDING;
  return midX;
}

/**
 * Get node label text-anchor based on layer and label position setting
 */
function getNodeLabelAnchor(
  node: SankeyNode,
  maxLayer: number,
  labelPosition: string,
  labelAlign = "center"
): string {
  if (labelPosition === "inside") {
    if (labelAlign === "left") return "start";
    if (labelAlign === "right") return "end";
    return "middle";
  }

  // "auto" and "outside" use the same adaptive logic
  if (node.layer === 0) return "end";
  if (node.layer === maxLayer) return "start";
  return "middle";
}

/**
 * Whether a label is rendered on top of its node rectangle.
 */
function isLabelOnNode(
  node: SankeyNode,
  maxLayer: number,
  labelPosition: string
): boolean {
  if (labelPosition === "inside") return true;
  // "auto" and "outside" place middle-layer labels at midX (centered on node)
  return node.layer !== 0 && node.layer !== maxLayer;
}

/**
 * Post-render collision detection for node labels.
 * Groups labels by layer, tries font scaling first, then hides
 * lower-priority (smaller node value) labels that still collide.
 * Must be called after the SVG is in the DOM so getBBox() works.
 */
export function resolveLabelsPostRender(
  svgElement: SVGSVGElement,
  nodes: SankeyNode[]
): Set<number> {
  const hiddenNodeIndices = new Set<number>();
  const svg = d3.select(svgElement);
  const labelElements = svg.selectAll<SVGTextElement, SankeyNode>(".node-label");

  if (labelElements.empty()) return hiddenNodeIndices;

  // Group labels by layer
  const byLayer = new Map<number, { el: SVGTextElement; node: SankeyNode }[]>();
  labelElements.each(function (this: SVGTextElement | null, d: SankeyNode) {
    if (!this) return;
    const layer = d.layer;
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push({ el: this, node: d });
  });

  for (const [, layerLabels] of byLayer) {
    if (layerLabels.length <= 1) continue;

    // Sort by node value descending — larger nodes have higher priority
    const sorted = [...layerLabels].sort(
      (a, b) => (b.node.value || 0) - (a.node.value || 0)
    );

    // Try reducing font size to resolve collisions
    let fontSize = LABEL_FONT_SIZE_DEFAULT;
    // Respect user-configured font size if set on the labels
    const firstEl = sorted[0]?.el;
    if (firstEl) {
      const currentSize = parseFloat(firstEl.getAttribute("font-size") || "");
      if (!isNaN(currentSize) && currentSize > 0) fontSize = currentSize;
    }
    const minFont = Math.min(fontSize, LABEL_FONT_SIZE_MIN);
    let hasCollisions = true;

    while (hasCollisions && fontSize >= minFont) {
      // Apply font size to all labels in this layer
      for (const item of sorted) {
        item.el.style.fontSize = `${fontSize}px`;
      }

      hasCollisions = detectCollisions(sorted.map((s) => s.el));
      if (hasCollisions && fontSize > minFont) {
        fontSize--;
      } else {
        break;
      }
    }

    // If still collisions at min font, hide lower-priority labels
    if (hasCollisions) {
      hideCollidingLabels(sorted, hiddenNodeIndices);
    }
  }

  return hiddenNodeIndices;
}

/**
 * Check if any labels in the list collide (by Y-sorted bounding boxes)
 */
function detectCollisions(elements: SVGTextElement[]): boolean {
  // Sort by Y position for pairwise check
  const withBbox = elements
    .filter((el) => el.style.display !== "none")
    .map((el) => ({ el, bbox: el.getBBox() }))
    .sort((a, b) => a.bbox.y - b.bbox.y);

  for (let i = 0; i < withBbox.length - 1; i++) {
    const current = withBbox[i].bbox;
    const next = withBbox[i + 1].bbox;
    if (current.y + current.height + LABEL_COLLISION_PADDING > next.y) {
      return true;
    }
  }
  return false;
}

/**
 * Hide lower-priority labels that collide with higher-priority ones.
 * Sorted input: highest priority (largest value) first.
 */
function hideCollidingLabels(
  sorted: { el: SVGTextElement; node: SankeyNode }[],
  hiddenNodeIndices: Set<number>
): void {
  // Keep track of visible label bounding boxes
  const visibleBboxes: DOMRect[] = [];

  for (const item of sorted) {
    const bbox = item.el.getBBox();
    const rect = new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height);

    const collides = visibleBboxes.some(
      (vb) =>
        rect.y < vb.y + vb.height + LABEL_COLLISION_PADDING &&
        rect.y + rect.height + LABEL_COLLISION_PADDING > vb.y
    );

    if (collides) {
      item.el.style.display = "none";
      if (item.node.index !== undefined) {
        hiddenNodeIndices.add(item.node.index);
      }
    } else {
      visibleBboxes.push(rect);
    }
  }
}

/**
 * Get encoded data for Sankey layout
 */
export function getEncodedData(
  data: RowData[],
  encodingMap: EncodingMap,
  settings: ExtensionSettings
): EncodedData {
  // Drop-off mode requires ignoring nulls — nulls become drop-off nodes, not regular nodes
  const effectiveSettings = settings.sankeyType === "dropoff"
    ? { ...settings, ignoreNulls: true }
    : settings;

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nodesPerStage = new Map<number, Map<string, SankeyNode>>();

  // Process stage encodings to create nodes
  if (encodingMap.level) {
    for (
      let stageIndex = 0;
      stageIndex < encodingMap.level.length;
      stageIndex++
    ) {
      const stageField = encodingMap.level[stageIndex];
      nodesPerStage.set(stageIndex, new Map());

      // Track unique values with display names (formattedValue for aliases)
      const valueDisplayMap = new Map<string, string>();
      for (const row of data) {
        const cell = row[stageField.name];
        if (!cell) continue;
        const rawValue = cell.value?.toString() ?? "";
        if (isNullValue(rawValue) && effectiveSettings.ignoreNulls) continue;
        const key = isNullValue(rawValue) ? NULL_DISPLAY_NAME : rawValue;
        if (!valueDisplayMap.has(key)) {
          // Use formattedValue for display (aliases), fall back to raw value
          const displayName = isNullValue(rawValue)
            ? NULL_DISPLAY_NAME
            : (cell.formattedValue?.toString() || rawValue);
          valueDisplayMap.set(key, displayName);
        }
      }

      for (const [value, displayName] of valueDisplayMap) {
        const nodeId = `${stageIndex}-${value}`;
        const node: SankeyNode = {
          id: nodeId,
          name: displayName,
          layer: stageIndex,
          color: palette[stageIndex % palette.length],
        };
        nodes.push(node);
        nodesPerStage.get(stageIndex)!.set(value, node);
      }
    }
  }

  // Identify detail fields: columns in the data that aren't level or edge encodings
  const encodedFieldNames = new Set<string>();
  if (encodingMap.level) {
    for (const f of encodingMap.level) encodedFieldNames.add(f.name);
  }
  if (encodingMap.edge) {
    for (const f of encodingMap.edge) encodedFieldNames.add(f.name);
  }
  const detailFieldNames: string[] = [];
  if (data.length > 0) {
    for (const key of Object.keys(data[0])) {
      if (key !== "tupleId" && !encodedFieldNames.has(key)) {
        detailFieldNames.push(key);
      }
    }
  }

  // Process edge encodings to create flows
  if (encodingMap.edge && encodingMap.level && encodingMap.level.length >= 2) {
    for (const row of data) {
      const edgeField = encodingMap.edge[0];
      const edgeValue = getLinkValue(row, edgeField);

      if (edgeValue > 0) {
        // Check if any stage field is null — skip entire row if ignoreNulls
        // In drop-off mode, partial rows create flows only up to the null
        const isDropoff = effectiveSettings.sankeyType === "dropoff";
        if (effectiveSettings.ignoreNulls && !isDropoff) {
          const hasNull = encodingMap.level.some(
            (f) => isNullValue(row[f.name]?.value?.toString() ?? "")
          );
          if (hasNull) continue;
        }

        for (
          let stageIndex = 0;
          stageIndex < encodingMap.level.length - 1;
          stageIndex++
        ) {
          const sourceField = encodingMap.level[stageIndex];
          const targetField = encodingMap.level[stageIndex + 1];

          const sourceRaw = row[sourceField.name]?.value?.toString() ?? "";
          const targetRaw = row[targetField.name]?.value?.toString() ?? "";

          // In drop-off mode, stop creating flows when we hit a null
          if (isDropoff && effectiveSettings.ignoreNulls && (isNullValue(sourceRaw) || isNullValue(targetRaw))) break;
          // In non-drop-off mode with ignoreNulls off, use "(empty)" for nulls
          if (!isDropoff && effectiveSettings.ignoreNulls && (isNullValue(sourceRaw) || isNullValue(targetRaw))) continue;

          const sourceKey = isNullValue(sourceRaw) ? NULL_DISPLAY_NAME : sourceRaw;
          const targetKey = isNullValue(targetRaw) ? NULL_DISPLAY_NAME : targetRaw;

          const sourceNode = nodesPerStage.get(stageIndex)?.get(sourceKey);
          const targetNode = nodesPerStage.get(stageIndex + 1)?.get(targetKey);

          if (sourceNode && targetNode) {
            // Collect detail field values for this flow
            const detailValues: Record<string, string> = {};
            for (const fieldName of detailFieldNames) {
              const cell = row[fieldName];
              if (cell) {
                detailValues[fieldName] = cell.formattedValue?.toString() || cell.value?.toString() || "";
              }
            }

            links.push({
              source: sourceNode.id,
              target: targetNode.id,
              value: edgeValue,
              tupleId: row.tupleId,
              ...(detailFieldNames.length > 0 ? { detailValues } : {}),
            });
          }
        }
      }
    }
  }

  // Circuit breaker (Step 14): detect values appearing in multiple stages
  const warnings: string[] = [];
  const valueToStages = new Map<string, number[]>();
  for (const node of nodes) {
    const existing = valueToStages.get(node.name) || [];
    existing.push(node.layer);
    valueToStages.set(node.name, existing);
  }
  const multiStageNames: string[] = [];
  for (const [name, stages] of valueToStages) {
    if (stages.length > 1) {
      multiStageNames.push(name);
    }
  }
  if (multiStageNames.length > 0) {
    const nameList = multiStageNames.length <= 3
      ? multiStageNames.map((n) => `"${n}"`).join(", ")
      : `${multiStageNames.slice(0, 3).map((n) => `"${n}"`).join(", ")} and ${multiStageNames.length - 3} more`;
    warnings.push(
      `Some values (${nameList}) appear in multiple columns. This can cause overlapping nodes. To fix this, use unique names in each column.`
    );
  }

  // Detect self-referencing flows (source === target by name)
  const finalLinks = effectiveSettings.aggregateFlows ? aggregateFlows(links) : links;
  const cleanLinks = finalLinks.filter((link) => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;
    if (sourceId === targetId) {
      warnings.push(`"${sourceId}" links to itself and was skipped.`);
      return false;
    }
    return true;
  });

  // Drop-off mode: add synthetic drop-off nodes and flows for lost value
  if (effectiveSettings.sankeyType === "dropoff" && encodingMap.level && encodingMap.level.length >= 2) {
    const dropoffNodes: SankeyNode[] = [];
    const dropoffLinks: SankeyLink[] = [];
    let dropoffTupleCounter = -1;

    const nodeOutgoing = new Map<string, number>();
    const nodeIncoming = new Map<string, number>();
    for (const link of cleanLinks) {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      nodeOutgoing.set(sourceId, (nodeOutgoing.get(sourceId) || 0) + link.value);
      nodeIncoming.set(targetId, (nodeIncoming.get(targetId) || 0) + link.value);
    }

    // Parse per-node drop-off color overrides
    let dropoffOverrides: Record<string, string> = {};
    if (effectiveSettings.dropoffColorMode === "perNode") {
      try {
        const parsed: unknown = JSON.parse(effectiveSettings.dropoffNodeColors);
        if (parsed && typeof parsed === "object") dropoffOverrides = parsed as Record<string, string>;
      } catch { /* fallback */ }
    }

    const maxStage = encodingMap.level.length - 1;
    for (const node of nodes) {
      if (node.layer >= maxStage) continue;
      const incoming = nodeIncoming.get(node.id) || 0;
      const outgoing = nodeOutgoing.get(node.id) || 0;
      const total = node.layer === 0 ? outgoing : incoming;
      const lost = total - outgoing;

      if (lost > 0) {
        const dropoffId = `dropoff-${node.layer}-${node.id}`;
        const dropoffName = `${node.name} (Drop-off)`;
        const color = dropoffOverrides[dropoffName] || DROPOFF_COLOR;
        dropoffNodes.push({
          id: dropoffId,
          name: dropoffName,
          layer: node.layer + 1,
          color,
        });
        dropoffLinks.push({
          source: node.id,
          target: dropoffId,
          value: lost,
          tupleId: dropoffTupleCounter--,
        });
      }
    }

    nodes.push(...dropoffNodes);
    cleanLinks.push(...dropoffLinks);
  }

  return { nodes, links: cleanLinks, warnings };
}

/**
 * Aggregate flows with the same source-target pair
 */
function aggregateFlows(links: SankeyLink[]): SankeyLink[] {
  const flowMap = new Map<string, SankeyLink>();
  // Track unique detail values per aggregated flow
  const detailSets = new Map<string, Map<string, Set<string>>>();

  for (const link of links) {
    const key = `${link.source}\x00${link.target}`;
    const existing = flowMap.get(key);

    if (existing) {
      existing.value += link.value;
      if (!existing.tupleIds) existing.tupleIds = [existing.tupleId];
      existing.tupleIds.push(link.tupleId);

      // Merge detail values
      if (link.detailValues) {
        let sets = detailSets.get(key);
        if (!sets) {
          sets = new Map();
          detailSets.set(key, sets);
        }
        for (const [field, val] of Object.entries(link.detailValues)) {
          let fieldSet = sets.get(field);
          if (!fieldSet) {
            fieldSet = new Set();
            sets.set(field, fieldSet);
          }
          fieldSet.add(val);
        }
      }
    } else {
      flowMap.set(key, { ...link, tupleIds: [link.tupleId] });

      // Initialize detail sets for the first link
      if (link.detailValues) {
        const sets = new Map<string, Set<string>>();
        for (const [field, val] of Object.entries(link.detailValues)) {
          sets.set(field, new Set([val]));
        }
        detailSets.set(key, sets);
      }
    }
  }

  // Convert collected detail sets back to detailValues on aggregated links
  for (const [key, link] of flowMap) {
    const sets = detailSets.get(key);
    if (sets && sets.size > 0) {
      const merged: Record<string, string> = {};
      for (const [field, values] of sets) {
        merged[field] = [...values].join(", ");
      }
      link.detailValues = merged;
    }
  }

  return [...flowMap.values()];
}

/**
 * Compute Sankey layout with alignment and sort settings
 */
export function computeSankeyLayout(
  d3Sankey: any,
  data: EncodedData,
  top: number,
  width: number,
  height: number,
  nodeWidth: number,
  padding: number,
  settings: ExtensionSettings
): EncodedData {
  const { nodes, links } = data;

  const alignFn =
    NODE_ALIGNMENT_MAP[settings.nodeAlignment] || sankeyJustify;

  // Reserve horizontal space for outside labels on first/last columns
  const hasOutsideLabels = settings.labelPosition !== "inside";
  const labelMargin = Math.min(
    LABEL_MARGIN_MAX,
    Math.max(LABEL_MARGIN_MIN, Math.round(width * LABEL_MARGIN_RATIO))
  );
  const xStart = hasOutsideLabels ? labelMargin : 1;
  const xEnd = hasOutsideLabels ? width - labelMargin : width - 1;

  const sankeyGenerator = d3Sankey()
    .nodeWidth(nodeWidth)
    .nodePadding(padding)
    .nodeAlign(alignFn)
    .nodeId((d: SankeyNode) => d.id)
    .extent([
      [xStart, top],
      [xEnd, height - BOTTOM_MARGIN],
    ]);

  // Apply node sort — all options use deterministic comparators
  // to prevent nodes from jumping when visual settings (padding, gap) change.
  if (settings.nodeSort === "ascending") {
    sankeyGenerator.nodeSort(
      (a: any, b: any) => (a.value || 0) - (b.value || 0)
    );
  } else if (settings.nodeSort === "descending") {
    sankeyGenerator.nodeSort(
      (a: any, b: any) => (b.value || 0) - (a.value || 0)
    );
  } else if (settings.nodeSort === "alphabetical") {
    sankeyGenerator.nodeSort(
      (a: any, b: any) => (a.name || "").localeCompare(b.name || "")
    );
  } else {
    // "auto" — preserve input order (stable across padding/gap changes)
    // Using null tells d3-sankey to keep nodes in the order they appear in the data
    sankeyGenerator.nodeSort(null as any);
  }

  const layout = sankeyGenerator({ nodes, links });

  // Restore saved node order overrides from drag
  let savedOrder: Record<string, string[]> = {};
  try {
    const parsed: unknown = JSON.parse(settings.nodePositions);
    if (parsed && typeof parsed === "object") savedOrder = parsed as Record<string, string[]>;
  } catch { /* fallback */ }

  if (Object.keys(savedOrder).length > 0) {
    // Group nodes by layer
    const nodesByLayer = new Map<number, SankeyNode[]>();
    for (const node of layout.nodes) {
      const layerNodes = nodesByLayer.get(node.layer) || [];
      layerNodes.push(node);
      nodesByLayer.set(node.layer, layerNodes);
    }

    for (const [layerStr, orderedIds] of Object.entries(savedOrder)) {
      if (!Array.isArray(orderedIds)) continue;
      const layerNodes = nodesByLayer.get(Number(layerStr));
      if (!layerNodes || layerNodes.length < 2) continue;

      // Sort nodes by current y position to get the layout's top-to-bottom order
      const byPosition = [...layerNodes].sort((a, b) => (a.y0 || 0) - (b.y0 || 0));
      const layoutTopY = byPosition[0].y0 || 0;

      // Compute uniform gap between nodes
      const totalNodeHeight = byPosition.reduce((sum, n) => sum + ((n.y1 || 0) - (n.y0 || 0)), 0);
      const lastNode = byPosition[byPosition.length - 1];
      const layerSpan = (lastNode.y1 || 0) - layoutTopY;
      const gap = byPosition.length > 1 ? (layerSpan - totalNodeHeight) / (byPosition.length - 1) : 0;

      // Sort nodes according to saved order, unknowns keep relative position at end
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      const sorted = [...layerNodes].sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Infinity;
        const bIdx = orderMap.get(b.id) ?? Infinity;
        if (aIdx === Infinity && bIdx === Infinity) return (a.y0 || 0) - (b.y0 || 0);
        return aIdx - bIdx;
      });

      // Stack nodes top-to-bottom preserving each node's own height
      let y = layoutTopY;
      for (const node of sorted) {
        const nodeHeight = (node.y1 || 0) - (node.y0 || 0);
        node.y0 = y;
        node.y1 = y + nodeHeight;
        y += nodeHeight + gap;
      }
    }

    sankeyGenerator.update(layout);
  }

  // Assign colors based on color scheme and encoding
  let selectedPalette: string[] =
    colorPalettes[settings.colorScheme as keyof typeof colorPalettes] || colorPalettes.default;

  if (settings.colorScheme === "custom") {
    try {
      const parsed: unknown = JSON.parse(settings.customColors);
      if (Array.isArray(parsed) && parsed.length > 0) {
        selectedPalette = parsed as string[];
      }
    } catch {
      // fallback to default palette
    }
  }

  // Parse per-node color overrides — apply on top of any scheme when enabled
  let nodeOverrides: Record<string, string> = {};
  if (settings.enableNodeColorOverrides) {
    try {
      const parsed: unknown = JSON.parse(settings.nodeColorOverrides);
      if (parsed && typeof parsed === "object") nodeOverrides = parsed as Record<string, string>;
    } catch { /* fallback */ }
  }

  // Parse per-stage palettes
  let stagePalettes: Record<string, string[]> = {};
  if (settings.colorScheme === "perStage") {
    try {
      const parsed: unknown = JSON.parse(settings.stagePalettes);
      if (parsed && typeof parsed === "object") stagePalettes = parsed as Record<string, string[]>;
    } catch { /* fallback */ }
  }

  layout.nodes.forEach((node: SankeyNode) => {
    // Drop-off nodes keep their pre-assigned color (DROPOFF_COLOR or per-node override)
    if (node.id.startsWith("dropoff-")) return;

    // Per-node override takes highest priority (works with any color scheme)
    if (nodeOverrides[node.name]) {
      node.color = nodeOverrides[node.name];
      return;
    }

    // Per-stage palette
    if (settings.colorScheme === "perStage") {
      const layerPalette = stagePalettes[String(node.layer)];
      if (layerPalette && layerPalette.length > 0) {
        // Within a stage, assign colors by index among nodes in that stage
        const nodesInLayer = layout.nodes.filter((n: SankeyNode) => n.layer === node.layer);
        const indexInLayer = nodesInLayer.indexOf(node);
        node.color = layerPalette[indexInLayer % layerPalette.length];
        return;
      }
      // Fall through to default if no palette for this stage
    }

    const nodeIndex = layout.nodes.indexOf(node);
    node.color = selectedPalette[nodeIndex % selectedPalette.length];
  });

  return layout;
}

/**
 * Get flow path for Sankey diagram, optionally inset by flowGap on each end
 */
export function getFlowPath(d: SankeyLink, flowGap: number = 0): string {
  if (flowGap <= 0) {
    const path = sankeyLinkHorizontal()(d as any);
    return path || "";
  }

  const source = d.source as SankeyNode;
  const target = d.target as SankeyNode;
  // Clamp gap so flows never reverse direction
  const maxGap = ((target.x0 || 0) - (source.x1 || 0)) / 2 - 1;
  const clampedGap = Math.max(0, Math.min(flowGap, maxGap));
  const sx = (source.x1 || 0) + clampedGap;
  const tx = (target.x0 || 0) - clampedGap;
  const sy = d.y0 || 0;
  const ty = d.y1 || 0;
  const midX = (sx + tx) / 2;
  return `M${sx},${sy}C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
}

/**
 * Get flow value from row data
 */
export function getLinkValue(row: RowData, hasLinks: Field): number {
  if (!hasLinks || !row[hasLinks.name]) {
    return 1;
  }

  const value = row[hasLinks.name].value;
  return isNaN(Number(value)) ? 1 : Math.max(0, Number(value));
}

/**
 * Main rendering function
 */
export async function renderViz(
  rawData: RowData[],
  encodingMap: EncodingMap,
  selectedMarksIds: Map<number, boolean>,
  styles: any,
  settings: ExtensionSettings
): Promise<{
  hoveringLayer: any;
  flowsPerTupleId: Map<number, any[]>;
}> {
  const encodedData = getEncodedData(rawData, encodingMap, settings);

  const content = document.getElementById("content");
  if (!content) throw new Error("Content element not found");

  content.innerHTML = "";

  const result = await Sankey(
    encodedData,
    encodingMap,
    content.offsetWidth,
    content.offsetHeight,
    selectedMarksIds,
    styles,
    settings
  );

  content.appendChild(result.viz);

  return result;
}

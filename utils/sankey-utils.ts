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
import { getColor, getGradientId, getContrastingLabelColor } from "./color-utils";
import {
  getSelectedNodes,
  getLinksPerTupleId,
  renderSelection,
} from "./interaction-utils";
import {
  X_PADDING,
  Y_PADDING,
  TOP_MARGIN,
  LABEL_MARGIN,
  LINK_OPACITY,
  LINK_SELECTED_OPACITY,
  LINK_FOGGED_OPACITY,
  NODE_BORDER_COLOR,
  NODE_BORDER_WIDTH,
  LABEL_PADDING,
  MIN_NODE_HEIGHT_FOR_VALUE,
  LABEL_FONT_SIZE_DEFAULT,
  LABEL_FONT_SIZE_MIN,
  LABEL_COLLISION_PADDING,
  NULL_DISPLAY_NAME,
  LINK_LABEL_MIN_WIDTH,
  ExtensionSettings,
} from "./constants";

export interface SankeyNode {
  id: string;
  name: string;
  layer: number;
  color: string;
  colorValue?: string;
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
  linksPerTupleId: Map<number, any[]>;
  viz: SVGElement;
  totalLinkValue: number;
  layoutLinks: SankeyLink[];
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

  const totalLinkValue = layout.links.reduce(
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
    .attr("font-family", styles?.fontFamily || "sans-serif")
    .attr("font-weight", styles?.fontWeight || "normal")
    .attr("font-size", styles?.fontSize || "12px")
    .attr("font-style", styles?.fontStyle || "normal")
    .attr("text-decoration", styles?.textDecoration || "none")
    .attr("role", "img")
    .attr(
      "aria-label",
      `Sankey diagram with ${layout.nodes.length} nodes across ${maxLayer + 1} levels showing flow values`
    );

  // Add gradient definitions for gradient link style
  if (settings.linkStyle === "gradient") {
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

  // Apply drag behavior if enabled (Step 11)
  if (settings.enableDrag) {
    const nodeRects = svg.selectAll<SVGRectElement, SankeyNode>(".node");
    const linkPaths = () => svg.selectAll<SVGPathElement, SankeyLink>(".link");

    nodeRects.call(
      d3.drag<SVGRectElement, SankeyNode>()
        .on("start", function () {
          d3.select(this).raise().attr("stroke-width", 2);
        })
        .on("drag", function (event: any, d: SankeyNode) {
          const dy = event.dy;
          const nodeHeight = (d.y1 || 0) - (d.y0 || 0);
          const newY0 = Math.max(TOP_MARGIN, Math.min(height - 5 - nodeHeight, (d.y0 || 0) + dy));
          d.y0 = newY0;
          d.y1 = newY0 + nodeHeight;
          d3.select(this).attr("y", d.y0);

          // Recalculate link paths
          linkPaths().attr("d", getLinkPath);

          // Update link labels if shown
          if (settings.showLinkLabels) {
            svg.selectAll<SVGTextElement, SankeyLink>(".link-label")
              .attr("y", (ld: SankeyLink) => ((ld.y0 || 0) + (ld.y1 || 0)) / 2);
          }

          // Update node labels
          svg.selectAll<SVGTextElement, SankeyNode>(".node-label")
            .filter((nd: SankeyNode) => nd.id === d.id)
            .attr("y", ((d.y1 || 0) + (d.y0 || 0)) / 2);
        })
        .on("end", function () {
          d3.select(this).attr("stroke-width", NODE_BORDER_WIDTH);
        })
    );
  }

  // Create link paths
  const links = svg
    .append("g")
    .style("cursor", "pointer")
    .selectAll()
    .data(layout.links)
    .join("path")
    .attr("class", "link")
    .attr("d", getLinkPath)
    .attr("stroke", (d: SankeyLink) =>
      getLinkStroke(d, settings.linkStyle)
    )
    .style("stroke-opacity", (d: SankeyLink) =>
      getLinkOpacity(d, selectedTupleIds)
    )
    .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width || 1));

  // Add link labels (Step 6)
  if (settings.showLinkLabels) {
    svg
      .append("g")
      .attr("class", "link-labels")
      .attr("pointer-events", "none")
      .selectAll()
      .data(layout.links.filter((l: SankeyLink) => (l.width || 0) >= LINK_LABEL_MIN_WIDTH))
      .join("text")
      .attr("class", "link-label")
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
      .attr("font-size", "10px")
      .attr("fill", "#555")
      .attr("fill-opacity", 0.8)
      .text((d: SankeyLink) => d.value.toLocaleString());
  }

  // Add node labels at natural positions (collision resolved post-render)
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
    .text((d: SankeyNode) => d.name)
    .attr("fill", (d: SankeyNode, index: number) => {
      const baseColor = isLabelOnNode(d, maxLayer, settings.labelPosition)
        ? getContrastingLabelColor(d.color)
        : "black";
      return getColor(baseColor, selectedTupleIds, selectedNodeIndexes.has(index));
    })
    .each(function (this: SVGTextElement | null, d: SankeyNode) {
      if (!this) return;
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
        .attr("font-size", "10px")
        .attr("fill-opacity", 0.7)
        .text(nodeValue.toLocaleString());
    });

  // Add top labels for levels
  if (encodingMap.level) {
    const levels: (SankeyNode | undefined)[] = [];
    for (const node of layout.nodes) {
      levels[node.layer] = node;
    }

    svg
      .append("g")
      .selectAll()
      .data(levels.filter(Boolean))
      .join("text")
      .attr("class", "level-label")
      .attr("x", (d: SankeyNode | undefined) =>
        d ? ((d.x1 || 0) + (d.x0 || 0)) / 2 : 0
      )
      .attr("y", TOP_MARGIN / 2)
      .attr("text-anchor", "middle")
      .text((d: SankeyNode | undefined) =>
        d ? encodingMap.level![d.layer].name : ""
      )
      .attr("fill", styles?.color || "#333");
  }

  // Selection and hovering layers (decorative)
  const selectionLayer = svg.append("g").attr("aria-hidden", "true");
  const hoveringLayer = svg.append("g").attr("aria-hidden", "true");

  const linksPerTupleId = getLinksPerTupleId(links);

  renderSelection(
    selectedTupleIds,
    linksPerTupleId,
    selectionLayer,
    hoveringLayer
  );

  return {
    hoveringLayer,
    linksPerTupleId,
    viz: svg.node()!,
    totalLinkValue,
    layoutLinks: layout.links,
    layoutNodes: layout.nodes,
  };
}

/**
 * Get link stroke color or gradient URL
 */
function getLinkStroke(link: SankeyLink, linkStyle: string): string {
  const source = link.source as SankeyNode;
  const target = link.target as SankeyNode;

  switch (linkStyle) {
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
 * Get link opacity based on selection state
 */
function getLinkOpacity(
  link: SankeyLink,
  selectedTupleIds: Map<number, boolean>
): number {
  if (selectedTupleIds.size === 0) return LINK_OPACITY;

  const ids = link.tupleIds || [link.tupleId];
  const isSelected = ids.some((id) => selectedTupleIds.has(id));
  return isSelected ? LINK_SELECTED_OPACITY : LINK_FOGGED_OPACITY;
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
    let hasCollisions = true;

    while (hasCollisions && fontSize >= LABEL_FONT_SIZE_MIN) {
      // Apply font size to all labels in this layer
      for (const item of sorted) {
        item.el.style.fontSize = `${fontSize}px`;
      }

      hasCollisions = detectCollisions(sorted.map((s) => s.el));
      if (hasCollisions && fontSize > LABEL_FONT_SIZE_MIN) {
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
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nodesPerLevel = new Map<number, Map<string, SankeyNode>>();

  // Process level encodings to create nodes
  if (encodingMap.level) {
    for (
      let levelIndex = 0;
      levelIndex < encodingMap.level.length;
      levelIndex++
    ) {
      const levelField = encodingMap.level[levelIndex];
      nodesPerLevel.set(levelIndex, new Map());

      // Track unique values with display names (formattedValue for aliases)
      const valueDisplayMap = new Map<string, string>();
      for (const row of data) {
        const cell = row[levelField.name];
        if (!cell) continue;
        const rawValue = cell.value?.toString() ?? "";
        if (!rawValue && settings.ignoreNulls) continue;
        const key = rawValue || NULL_DISPLAY_NAME;
        if (!valueDisplayMap.has(key)) {
          // Use formattedValue for display (aliases), fall back to raw value
          const displayName = rawValue
            ? (cell.formattedValue?.toString() || rawValue)
            : NULL_DISPLAY_NAME;
          valueDisplayMap.set(key, displayName);
        }
      }

      for (const [value, displayName] of valueDisplayMap) {
        const nodeId = `${levelIndex}-${value}`;
        const node: SankeyNode = {
          id: nodeId,
          name: displayName,
          layer: levelIndex,
          color: palette[levelIndex % palette.length],
        };
        nodes.push(node);
        nodesPerLevel.get(levelIndex)!.set(value, node);
      }
    }
  }

  // Color encoding: assign colorValue to nodes
  if (
    encodingMap.color &&
    encodingMap.color.length > 0 &&
    encodingMap.level
  ) {
    const colorField = encodingMap.color[0];
    const nodeColorCounts = new Map<string, Map<string, number>>();

    for (const row of data) {
      const colorVal = row[colorField.name]?.value?.toString();
      if (!colorVal) continue;

      for (let li = 0; li < encodingMap.level.length; li++) {
        const lf = encodingMap.level[li];
        const nv = row[lf.name]?.value?.toString() ?? "";
        const nodeKey = nv || NULL_DISPLAY_NAME;
        if (!nv && settings.ignoreNulls) continue;
        const nodeId = `${li}-${nodeKey}`;

        if (!nodeColorCounts.has(nodeId))
          nodeColorCounts.set(nodeId, new Map());
        const counts = nodeColorCounts.get(nodeId)!;
        counts.set(colorVal, (counts.get(colorVal) || 0) + 1);
      }
    }

    for (const node of nodes) {
      const counts = nodeColorCounts.get(node.id);
      if (!counts) continue;

      let maxCount = 0;
      let dominant = "";
      for (const [cv, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          dominant = cv;
        }
      }
      node.colorValue = dominant;
    }
  }

  // Process edge encodings to create links
  if (encodingMap.edge && encodingMap.level && encodingMap.level.length >= 2) {
    for (const row of data) {
      const edgeField = encodingMap.edge[0];
      const edgeValue = getLinkValue(row, edgeField);

      if (edgeValue > 0) {
        // Check if any level field is null — skip entire row if ignoreNulls
        if (settings.ignoreNulls) {
          const hasNull = encodingMap.level.some(
            (f) => !row[f.name]?.value?.toString()
          );
          if (hasNull) continue;
        }

        for (
          let levelIndex = 0;
          levelIndex < encodingMap.level.length - 1;
          levelIndex++
        ) {
          const sourceField = encodingMap.level[levelIndex];
          const targetField = encodingMap.level[levelIndex + 1];

          const sourceRaw = row[sourceField.name]?.value?.toString() ?? "";
          const targetRaw = row[targetField.name]?.value?.toString() ?? "";
          const sourceKey = sourceRaw || NULL_DISPLAY_NAME;
          const targetKey = targetRaw || NULL_DISPLAY_NAME;

          const sourceNode = nodesPerLevel.get(levelIndex)?.get(sourceKey);
          const targetNode = nodesPerLevel.get(levelIndex + 1)?.get(targetKey);

          if (sourceNode && targetNode) {
            links.push({
              source: sourceNode.id,
              target: targetNode.id,
              value: edgeValue,
              tupleId: row.tupleId,
            });
          }
        }
      }
    }
  }

  // Circuit breaker (Step 14): detect values appearing in multiple levels
  const warnings: string[] = [];
  const valueToLevels = new Map<string, number[]>();
  for (const node of nodes) {
    const existing = valueToLevels.get(node.name) || [];
    existing.push(node.layer);
    valueToLevels.set(node.name, existing);
  }
  for (const [name, levels] of valueToLevels) {
    if (levels.length > 1) {
      warnings.push(
        `"${name}" appears in levels ${levels.map((l) => l + 1).join(", ")}. This may cause unexpected layout.`
      );
    }
  }

  // Detect self-referencing links (source === target by name)
  const finalLinks = settings.aggregateLinks ? aggregateLinks(links) : links;
  const cleanLinks = finalLinks.filter((link) => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;
    if (sourceId === targetId) {
      warnings.push(`Self-referencing link skipped: ${sourceId}`);
      return false;
    }
    return true;
  });

  return { nodes, links: cleanLinks, warnings };
}

/**
 * Aggregate links with the same source-target pair
 */
function aggregateLinks(links: SankeyLink[]): SankeyLink[] {
  const linkMap = new Map<string, SankeyLink>();

  for (const link of links) {
    const key = `${link.source}\x00${link.target}`;
    const existing = linkMap.get(key);

    if (existing) {
      existing.value += link.value;
      if (!existing.tupleIds) existing.tupleIds = [existing.tupleId];
      existing.tupleIds.push(link.tupleId);
    } else {
      linkMap.set(key, { ...link, tupleIds: [link.tupleId] });
    }
  }

  return [...linkMap.values()];
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
  const xStart = hasOutsideLabels ? LABEL_MARGIN : 1;
  const xEnd = hasOutsideLabels ? width - LABEL_MARGIN : width - 1;

  const sankeyGenerator = d3Sankey()
    .nodeWidth(nodeWidth)
    .nodePadding(padding)
    .nodeAlign(alignFn)
    .nodeId((d: SankeyNode) => d.id)
    .extent([
      [xStart, top],
      [xEnd, height - 5],
    ]);

  // Apply node sort
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
  }
  // "auto" = no nodeSort set (d3 default)

  const layout = sankeyGenerator({ nodes, links });

  // Assign colors based on color encoding or level
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

  const uniqueColorValues = [
    ...new Set(
      layout.nodes
        .map((n: SankeyNode) => n.colorValue)
        .filter(Boolean) as string[]
    ),
  ].sort();

  const hasColorEncoding = uniqueColorValues.length > 0;

  layout.nodes.forEach((node: SankeyNode) => {
    if (hasColorEncoding && node.colorValue) {
      const colorIndex = uniqueColorValues.indexOf(node.colorValue);
      node.color =
        selectedPalette[colorIndex % selectedPalette.length];
    } else {
      node.color =
        selectedPalette[node.layer % selectedPalette.length];
    }
  });

  return layout;
}

/**
 * Get link path for Sankey diagram
 */
export function getLinkPath(d: SankeyLink): string {
  const path = sankeyLinkHorizontal()(d as any);
  return path || "";
}

/**
 * Get link value from row data
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
  linksPerTupleId: Map<number, any[]>;
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

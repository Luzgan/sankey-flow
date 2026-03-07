import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { Field, DataValue } from "@tableau/extensions-api-types";
import { EncodingMap, RowData } from "./tableau-utils";
import { getColor, getLinkColor } from "./color-utils";
import {
  getSelectedNodes,
  getLinksPerTupleId,
  renderSelection,
} from "./interaction-utils";

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
}

export interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  tupleId: number;
  width?: number;
  y0?: number;
  y1?: number;
}

export interface EncodedData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Color palettes for different schemes
export const colorPalettes = {
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
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
  ],
  monochrome: [
    "#2c3e50", // dark blue-gray
    "#34495e", // medium blue-gray
    "#7f8c8d", // light blue-gray
    "#95a5a6", // lighter blue-gray
    "#bdc3c7", // very light blue-gray
    "#d5dbdb", // pale blue-gray
    "#ecf0f1", // off-white
    "#f8f9fa", // white-gray
    "#e8e8e8", // light gray
    "#d0d0d0", // medium gray
  ],
};

// Default palette for backward compatibility
export const palette = colorPalettes.default;

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
  settings: { colorScheme: "default" | "colorblind" | "monochrome" }
): Promise<{
  hoveringLayer: any;
  linksPerTupleId: Map<number, any[]>;
  viz: SVGElement;
}> {
  const xPadding = 2;
  const yPadding = 1;
  const levelWidth = 100;
  const top = 20;

  const layout = computeSankeyLayout(
    sankey,
    encodedData,
    top,
    width,
    height,
    levelWidth + xPadding * 2,
    yPadding,
    settings
  );

  // Create an SVG container
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
    .attr("text-decoration", styles?.textDecoration || "none");

  const selectedNodeIndexes = getSelectedNodes(layout.links, selectedTupleIds);

  // Create the rects that represent the nodes
  svg
    .append("g")
    .selectAll()
    .data(layout.nodes)
    .join("rect")
    .attr("class", "node")
    .attr("x", (d: SankeyNode) => (d.x0 || 0) + xPadding)
    .attr("y", (d: SankeyNode) => d.y0 || 0)
    .attr("height", (d: SankeyNode) => (d.y1 || 0) - (d.y0 || 0))
    .attr("width", (d: SankeyNode) => (d.x1 || 0) - (d.x0 || 0) - xPadding * 2)
    .attr("fill", (d: SankeyNode, index: number) =>
      getColor(d.color, selectedTupleIds, selectedNodeIndexes.has(index))
    )
    .attr("stroke", "#000")
    .attr("stroke-width", 1);

  // Create the paths that represent the links
  const links = svg
    .append("g")
    .attr("fill-opacity", 0.5)
    .style("cursor", "pointer")
    .selectAll()
    .data(layout.links)
    .join("path")
    .attr("class", "link")
    .attr("d", getLinkPath)
    .attr("fill", (d: SankeyLink) => getLinkColor(d, selectedTupleIds))
    .attr("stroke", (d: SankeyLink) => getLinkColor(d, selectedTupleIds))
    .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width || 1));

  // Add labels on the nodes
  svg
    .append("g")
    .selectAll()
    .data(layout.nodes)
    .join("text")
    .attr("class", "node-label")
    .attr("x", (d: SankeyNode) => ((d.x1 || 0) + (d.x0 || 0)) / 2)
    .attr("y", (d: SankeyNode) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text((d: SankeyNode) => d.name)
    .attr("fill", (d: SankeyNode, index: number) =>
      getColor("black", selectedTupleIds, selectedNodeIndexes.has(index))
    );

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
      .attr("y", top / 2)
      .attr("text-anchor", "middle")
      .text((d: SankeyNode | undefined) =>
        d ? encodingMap.level![d.layer].name : ""
      )
      .attr("fill", styles?.color || "#333");
  }

  // Container for rendering selected elements (rendered last)
  const selectionLayer = svg.append("g");
  const hoveringLayer = svg.append("g");

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
  };
}

/**
 * Get encoded data for Sankey layout
 */
export function getEncodedData(
  data: RowData[],
  encodingMap: EncodingMap
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

      // Get unique values for this level
      const uniqueValues = new Set<string>();
      for (const row of data) {
        if (row[levelField.name]) {
          uniqueValues.add(row[levelField.name].value.toString());
        }
      }

      // Create nodes for this level
      for (const value of uniqueValues) {
        const nodeId = `${levelIndex}-${value}`;
        const node: SankeyNode = {
          id: nodeId,
          name: value,
          layer: levelIndex,
          color: palette[levelIndex % palette.length],
        };
        nodes.push(node);
        nodesPerLevel.get(levelIndex)!.set(value, node);
      }
    }
  }

  // Process edge encodings to create links
  if (encodingMap.edge && encodingMap.level && encodingMap.level.length >= 2) {
    for (const row of data) {
      const edgeField = encodingMap.edge[0];
      const edgeValue = getLinkValue(row, edgeField);

      if (edgeValue > 0) {
        // Create links between consecutive levels
        for (
          let levelIndex = 0;
          levelIndex < encodingMap.level.length - 1;
          levelIndex++
        ) {
          const sourceField = encodingMap.level[levelIndex];
          const targetField = encodingMap.level[levelIndex + 1];

          const sourceValue = row[sourceField.name]?.value?.toString();
          const targetValue = row[targetField.name]?.value?.toString();

          if (sourceValue && targetValue) {
            const sourceNode = nodesPerLevel.get(levelIndex)?.get(sourceValue);
            const targetNode = nodesPerLevel
              .get(levelIndex + 1)
              ?.get(targetValue);

            if (sourceNode && targetNode) {
              const link: SankeyLink = {
                source: sourceNode.id,
                target: targetNode.id,
                value: edgeValue,
                tupleId: row.tupleId,
              };
              links.push(link);
            }
          }
        }
      }
    }
  }

  return { nodes, links };
}

/**
 * Compute Sankey layout
 */
export function computeSankeyLayout(
  d3Sankey: any,
  data: EncodedData,
  top: number,
  width: number,
  height: number,
  nodeWidth: number,
  padding: number,
  settings: { colorScheme: "default" | "colorblind" | "monochrome" }
): EncodedData {
  const { nodes, links } = data;

  // Create Sankey generator
  const sankeyGenerator = d3Sankey()
    .nodeWidth(nodeWidth)
    .nodePadding(padding)

    // .nodeSort(d)
    .nodeId((d: SankeyNode) => d.id)
    .extent([
      [1, top],
      [width - 1, height - 5],
    ]);

  // Generate the layout
  const layout = sankeyGenerator({ nodes, links });

  // Add colors to nodes
  // Get the appropriate color palette based on settings
  const selectedPalette = colorPalettes[settings.colorScheme];

  layout.nodes.forEach((node: SankeyNode) => {
    node.color = selectedPalette[node.layer % selectedPalette.length];
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
    return 1; // Default value if no edge field is specified
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
  settings: { colorScheme: "default" | "colorblind" | "monochrome" }
): Promise<{ hoveringLayer: any; linksPerTupleId: Map<number, any[]> }> {
  const encodedData = getEncodedData(rawData, encodingMap);

  const content = document.getElementById("content");
  if (!content) throw new Error("Content element not found");

  content.innerHTML = "";

  const sankey = await Sankey(
    encodedData,
    encodingMap,
    content.offsetWidth,
    content.offsetHeight,
    selectedMarksIds,
    styles,
    settings
  );

  content.appendChild(sankey.viz);

  return sankey;
}

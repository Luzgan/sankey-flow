import { select } from "d3-selection";
import { SankeyLink, SankeyNode } from "./sankey-utils";
import {
  selectTuples,
  clearHoveredMarks,
  getWorksheet,
} from "./tableau-utils";
import {
  ExtensionSettings,
  TOOLTIP_OFFSET_X,
  TOOLTIP_OFFSET_Y,
} from "./constants";

/**
 * Get flows per tuple ID for selection handling.
 * Handles both individual and aggregated flows.
 */
export function getFlowsPerTupleId(links: any): Map<number, any[]> {
  const flowsPerTupleId = new Map<number, any[]>();

  links.each(function (this: any, d: SankeyLink) {
    const ids = d.tupleIds || [d.tupleId];
    const selection = select(this);

    for (const id of ids) {
      let list = flowsPerTupleId.get(id);
      if (!list) {
        list = [];
        flowsPerTupleId.set(id, list);
      }
      list.push(selection);
    }
  });

  return flowsPerTupleId;
}

/**
 * Get selected node indexes from selected flows
 */
export function getSelectedNodes(
  links: SankeyLink[],
  selectedTupleIds: Map<number, boolean>
): Map<number, boolean> {
  const selectedNodeIndexes = new Map<number, boolean>();

  for (const link of links) {
    const ids = link.tupleIds || [link.tupleId];
    const isSelected = ids.some((id) => selectedTupleIds.has(id));

    if (isSelected) {
      const sourceNode =
        typeof link.source === "string" ? null : link.source;
      const targetNode =
        typeof link.target === "string" ? null : link.target;

      if (sourceNode && sourceNode.index !== undefined) {
        selectedNodeIndexes.set(sourceNode.index, true);
      }
      if (targetNode && targetNode.index !== undefined) {
        selectedNodeIndexes.set(targetNode.index, true);
      }
    }
  }

  return selectedNodeIndexes;
}

/**
 * Render selected elements on a separate top-level layer
 */
export function renderSelection(
  selectedTupleIds: Map<number, boolean>,
  flowsPerTupleId: Map<number, any[]>,
  selectionLayer: any,
  highlightingLayer: any
): void {
  selectionLayer.selectAll("*").remove();
  highlightingLayer.selectAll("*").remove();

  const selectedFlows: any[] = [];

  for (const id of selectedTupleIds.keys()) {
    const links = flowsPerTupleId.get(id);
    if (links) {
      selectedFlows.push(...links);
    }
  }

  let outline = selectionLayer.selectAll("g.selectionOutline");

  if (outline.empty()) {
    outline = selectionLayer
      .append("g")
      .attr("class", "selectionOutline");
  }

  outline
    .selectAll()
    .data(selectedFlows)
    .join("path")
    .attr("d", (link: any) => link.attr("d"))
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.5)
    .datum((link: any) => link.datum());
}

/**
 * Render hovered elements on a separate top-level layer.
 * extraFlows allows adding SVG selections directly (bypassing tupleId lookup).
 */
export function renderHoveredElements(
  hoveredTupleIds: Map<number, boolean>,
  flowsPerTupleId: Map<number, any[]>,
  hoveringLayer: any,
  extraFlows: any[] = []
): void {
  if (!hoveringLayer) return;

  hoveringLayer.selectAll("*").remove();

  const hoveredFlows: any[] = [...extraFlows];
  const seen = new Set(extraFlows);
  for (const id of hoveredTupleIds.keys()) {
    const links = flowsPerTupleId.get(id);
    if (links) {
      for (const link of links) {
        if (!seen.has(link)) {
          seen.add(link);
          hoveredFlows.push(link);
        }
      }
    }
  }

  hoveringLayer
    .selectAll()
    .data(hoveredFlows)
    .join("path")
    .attr("d", (link: any) => link.attr("d"))
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.4);
}


/**
 * Find only directly connected flows (incoming + outgoing) for a node
 */
export function getDirectConnections(
  nodeId: string,
  links: SankeyLink[]
): Set<number> {
  const tupleIds = new Set<number>();

  for (const link of links) {
    const sourceId =
      typeof link.source === "string" ? link.source : link.source.id;
    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;

    if (sourceId === nodeId || targetId === nodeId) {
      const ids = link.tupleIds || [link.tupleId];
      for (const id of ids) tupleIds.add(id);
    }
  }

  return tupleIds;
}

/**
 * For a drop-off node, find the source node ID it drops off from
 */
export function getDropoffSourceId(
  dropoffNodeId: string,
  links: SankeyLink[]
): string | null {
  for (const link of links) {
    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;
    if (targetId === dropoffNodeId) {
      return typeof link.source === "string" ? link.source : link.source.id;
    }
  }
  return null;
}

/**
 * Get or create the HTML tooltip element
 */
function getOrCreateTooltip(): HTMLDivElement {
  let tooltip = document.getElementById(
    "sankey-tooltip"
  ) as HTMLDivElement;

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "sankey-tooltip";
    tooltip.style.cssText = [
      "position:fixed",
      "pointer-events:none",
      "background:white",
      "border:1px solid #ccc",
      "border-radius:4px",
      "padding:6px 10px",
      'font-size:12px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      "box-shadow:0 2px 4px rgba(0,0,0,0.15)",
      "z-index:10000",
      "display:none",
      "white-space:nowrap",
      "color:#333",
    ].join(";");
    document.body.appendChild(tooltip);
  }

  return tooltip;
}

/**
 * Sanitize HTML for tooltip: strip script tags and event handlers
 */
function sanitizeTooltipHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
}

/**
 * Build tooltip HTML from template and placeholders
 */
function buildTooltipHtml(
  template: string,
  placeholders: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return sanitizeTooltipHtml(result);
}

/**
 * Show tooltip at the given position with HTML content
 */
function showTooltip(x: number, y: number, html: string): void {
  const tooltip = getOrCreateTooltip();
  tooltip.innerHTML = sanitizeTooltipHtml(html);
  tooltip.style.display = "block";
  tooltip.style.left = `${x + TOOLTIP_OFFSET_X}px`;
  tooltip.style.top = `${y + TOOLTIP_OFFSET_Y}px`;
}

/**
 * Hide the tooltip
 */
function hideTooltip(): void {
  const tooltip = document.getElementById(
    "sankey-tooltip"
  ) as HTMLDivElement;
  if (tooltip) tooltip.style.display = "none";
}

/**
 * Format detail values as HTML lines for tooltip display
 */
function formatDetailHtml(detailValues: Record<string, string> | undefined): string {
  if (!detailValues) return "";
  const entries = Object.entries(detailValues);
  if (entries.length === 0) return "";
  return entries
    .map(([field, value]) => `<span style="color:#888">${sanitizeTooltipHtml(field)}:</span> ${sanitizeTooltipHtml(value)}`)
    .join("<br>");
}

/**
 * Get tooltip content based on tooltip mode setting
 */
function getTooltipContent(
  settings: ExtensionSettings,
  placeholders: Record<string, string>,
  elementType: "node" | "link",
  detailValues?: Record<string, string>
): string {
  if (settings.tooltipMode === "minimal") {
    return `${placeholders.name}: ${placeholders.value}`;
  }

  if (settings.tooltipMode === "custom") {
    // Add {detail} placeholder support for custom templates
    const detailText = detailValues
      ? Object.entries(detailValues).map(([f, v]) => `${f}: ${v}`).join(", ")
      : "";
    return buildTooltipHtml(settings.tooltipTemplate, { ...placeholders, detail: detailText });
  }

  // "detailed" mode
  const detailHtml = formatDetailHtml(detailValues);
  const detailSuffix = detailHtml ? `<br>${detailHtml}` : "";

  if (elementType === "node") {
    return `<b>${placeholders.name}</b><br>${placeholders.value} (${placeholders.percentage}%)`;
  }
  return `<b>${placeholders.source}</b> \u2192 <b>${placeholders.target}</b><br>${placeholders.value} (${placeholders.percentage}%)${detailSuffix}`;
}

/**
 * Handle click events — supports both flow and node clicks.
 * Supports select, filter, and filterConnected click actions.
 */
export function onClick(
  e: MouseEvent,
  selectedTupleIds: Map<number, boolean>,
  hoveredTupleIds: Map<number, boolean>,
  layoutFlows: SankeyLink[]
): void {
  const element = document.elementFromPoint(
    e.pageX,
    e.pageY
  ) as Element;

  if (!element) {
    if (!e.ctrlKey) selectedTupleIds.clear();
    selectTuples(
      e.pageX,
      e.pageY,
      selectedTupleIds,
      hoveredTupleIds
    );
    return;
  }

  const elem = select(element);
  const isNode = element.classList?.contains("node");
  const isFlow = element.classList?.contains("flow");

  if (isNode) {
    const nodeData = elem.datum() as SankeyNode;

    if (!e.ctrlKey) selectedTupleIds.clear();

    for (const link of layoutFlows) {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;

      if (sourceId === nodeData.id || targetId === nodeData.id) {
        const ids = link.tupleIds || [link.tupleId];
        for (const id of ids) selectedTupleIds.set(id, true);
      }
    }
  } else if (isFlow) {
    const data = elem.datum() as SankeyLink;
    const ids = data.tupleIds || [data.tupleId];
    const allSelected = ids.every((id) =>
      selectedTupleIds.has(id)
    );

    if (allSelected) {
      if (selectedTupleIds.size === ids.length) {
        selectedTupleIds.clear();
      } else if (e.ctrlKey) {
        for (const id of ids) selectedTupleIds.delete(id);
      } else {
        selectedTupleIds.clear();
        for (const id of ids) selectedTupleIds.set(id, true);
      }
    } else {
      if (!e.ctrlKey) selectedTupleIds.clear();
      for (const id of ids) selectedTupleIds.set(id, true);
    }
  } else if (!e.ctrlKey) {
    selectedTupleIds.clear();
  }

  selectTuples(
    e.pageX,
    e.pageY,
    selectedTupleIds,
    hoveredTupleIds
  );
}

/**
 * Handle mouse move events — supports node hover path tracing and tooltip
 */
export async function onMouseMove(
  e: MouseEvent,
  hoveredTupleIds: Map<number, boolean>,
  flowsPerTupleId: Map<number, any[]>,
  hoveringLayer: any,
  settings: ExtensionSettings,
  totalFlowValue: number,
  layoutFlows: SankeyLink[],
  hiddenLabelNodeIds: Set<number> = new Set()
): Promise<void> {
  const element = document.elementFromPoint(
    e.pageX,
    e.pageY
  ) as Element;

  const isNode = element?.classList?.contains("node");
  const isFlow = element?.classList?.contains("flow");

  const hadHoveredTupleBefore = hoveredTupleIds.size !== 0;
  let extraHoverFlows: any[] = [];

  clearHoveredMarks(hoveredTupleIds);

  if (isNode && element) {
    const elem = select(element);
    const nodeData = elem.datum() as SankeyNode;

    // Highlight only directly connected flows (incoming + outgoing)
    const connectedIds = getDirectConnections(
      nodeData.id,
      layoutFlows
    );
    for (const id of connectedIds) {
      hoveredTupleIds.set(id, true);
    }

    // For drop-off nodes: also collect SVG elements for incoming flows
    // to the source node (bypassing tupleIds which are shared across flows)
    extraHoverFlows = [];
    if (nodeData.id.startsWith("dropoff-")) {
      const sourceId = getDropoffSourceId(nodeData.id, layoutFlows);
      if (sourceId) {
        const svgContainer = elem.node()?.closest("svg");
        if (svgContainer) {
          select(svgContainer)
            .selectAll<SVGPathElement, SankeyLink>(".flow")
            .each(function (d: SankeyLink) {
              const targetId =
                typeof d.target === "string" ? d.target : d.target.id;
              if (targetId === sourceId) {
                extraHoverFlows.push(select(this));
              }
            });
        }
      }
    }

    const nodeValue = nodeData.value || 0;
    const isLabelHidden = nodeData.index !== undefined &&
      hiddenLabelNodeIds.has(nodeData.index);

    if (settings.showPercentages || isLabelHidden) {
      const percentage =
        totalFlowValue > 0
          ? ((nodeValue / totalFlowValue) * 100).toFixed(1)
          : "0";
      const placeholders = {
        name: nodeData.name,
        value: nodeValue.toLocaleString(),
        percentage,
        source: "",
        target: "",
        level: String(nodeData.layer),
      };
      const tooltipHtml = getTooltipContent(settings, placeholders, "node");
      showTooltip(e.pageX, e.pageY, tooltipHtml);
    } else {
      hideTooltip();
    }

    // Hover first tupleId for Tableau hover actions
    const firstId = connectedIds.values().next().value;
    if (firstId !== undefined) {
      const tooltipCtx = settings.showTableauTooltip
        ? { tooltipAnchorPoint: { x: e.pageX, y: e.pageY } }
        : null;
      getWorksheet().hoverTupleAsync(firstId, tooltipCtx);
    }
  } else if (isFlow && element) {
    const elem = select(element);
    const data = elem.datum() as SankeyLink;
    const ids = data.tupleIds || [data.tupleId];

    for (const id of ids) {
      hoveredTupleIds.set(id, true);
    }

    if (settings.showPercentages) {
      const sourceName =
        typeof data.source === "string"
          ? data.source
          : data.source.name;
      const targetName =
        typeof data.target === "string"
          ? data.target
          : data.target.name;
      const percentage =
        totalFlowValue > 0
          ? ((data.value / totalFlowValue) * 100).toFixed(1)
          : "0";
      const placeholders = {
        name: `${sourceName} \u2192 ${targetName}`,
        value: data.value.toLocaleString(),
        percentage,
        source: sourceName,
        target: targetName,
        level: "",
      };
      const tooltipHtml = getTooltipContent(settings, placeholders, "link", data.detailValues);
      showTooltip(e.pageX, e.pageY, tooltipHtml);
    } else if (data.detailValues && Object.keys(data.detailValues).length > 0) {
      // Even without percentages, show detail values when available
      const sourceName =
        typeof data.source === "string"
          ? data.source
          : data.source.name;
      const targetName =
        typeof data.target === "string"
          ? data.target
          : data.target.name;
      const detailHtml = formatDetailHtml(data.detailValues);
      showTooltip(e.pageX, e.pageY,
        `<b>${sourceName}</b> \u2192 <b>${targetName}</b>: ${data.value.toLocaleString()}<br>${detailHtml}`);
    } else {
      hideTooltip();
    }

    // Hover for Tableau hover actions
    const flowTooltipCtx = settings.showTableauTooltip
      ? { tooltipAnchorPoint: { x: e.pageX, y: e.pageY } }
      : null;
    getWorksheet().hoverTupleAsync(data.tupleId, flowTooltipCtx);
  } else {
    hideTooltip();

    if (hadHoveredTupleBefore) {
      const clearCtx = settings.showTableauTooltip
        ? { tooltipAnchorPoint: { x: e.pageX, y: e.pageY } }
        : null;
      getWorksheet().hoverTupleAsync(0, clearCtx);
    }
  }

  renderHoveredElements(
    hoveredTupleIds,
    flowsPerTupleId,
    hoveringLayer,
    extraHoverFlows
  );
}

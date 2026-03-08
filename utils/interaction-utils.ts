import * as d3 from "d3";
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
 * Get links per tuple ID for selection handling.
 * Handles both individual and aggregated links.
 */
export function getLinksPerTupleId(links: any): Map<number, any[]> {
  const linksPerTupleId = new Map<number, any[]>();

  links.each(function (this: any, d: SankeyLink) {
    const ids = d.tupleIds || [d.tupleId];
    const selection = d3.select(this);

    for (const id of ids) {
      let list = linksPerTupleId.get(id);
      if (!list) {
        list = [];
        linksPerTupleId.set(id, list);
      }
      list.push(selection);
    }
  });

  return linksPerTupleId;
}

/**
 * Get selected node indexes from selected links
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
  linksPerTupleId: Map<number, any[]>,
  selectionLayer: any,
  highlightingLayer: any
): void {
  selectionLayer.selectAll("*").remove();
  highlightingLayer.selectAll("*").remove();

  const selectedLinks: any[] = [];

  for (const id of selectedTupleIds.keys()) {
    const links = linksPerTupleId.get(id);
    if (links) {
      selectedLinks.push(...links);
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
    .data(selectedLinks)
    .join("path")
    .attr("d", (link: any) => link.attr("d"))
    .datum((link: any) => link.datum());

  let fill = selectionLayer.selectAll("g.selection");

  if (fill.empty()) {
    fill = selectionLayer.append("g").attr("class", "selection");
  }

  fill
    .selectAll()
    .data(selectedLinks)
    .join("path")
    .attr("d", (link: any) => link.attr("d"))
    .datum((link: any) => link.datum());
}

/**
 * Render hovered elements on a separate top-level layer
 */
export function renderHoveredElements(
  hoveredTupleIds: Map<number, boolean>,
  linksPerTupleId: Map<number, any[]>,
  hoveringLayer: any
): void {
  if (!hoveringLayer) return;

  hoveringLayer.selectAll("*").remove();

  const hoveredLinks: any[] = [];
  for (const id of hoveredTupleIds.keys()) {
    const links = linksPerTupleId.get(id);
    if (links) {
      hoveredLinks.push(...links);
    }
  }

  hoveringLayer
    .selectAll()
    .data(hoveredLinks)
    .join("path")
    .attr("d", (link: any) => link.attr("d"))
    .attr("class", "highlighting");
}

/**
 * Find all connected paths from a node via BFS
 */
export function getConnectedPaths(
  nodeId: string,
  links: SankeyLink[]
): Set<number> {
  const visitedNodes = new Set<string>();
  const tupleIds = new Set<number>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visitedNodes.has(currentId)) continue;
    visitedNodes.add(currentId);

    for (const link of links) {
      const sourceId =
        typeof link.source === "string"
          ? link.source
          : link.source.id;
      const targetId =
        typeof link.target === "string"
          ? link.target
          : link.target.id;

      if (sourceId === currentId || targetId === currentId) {
        const ids = link.tupleIds || [link.tupleId];
        for (const id of ids) tupleIds.add(id);

        const nextId =
          sourceId === currentId ? targetId : sourceId;
        if (!visitedNodes.has(nextId)) queue.push(nextId);
      }
    }
  }

  return tupleIds;
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
 * Get tooltip content based on tooltip mode setting
 */
function getTooltipContent(
  settings: ExtensionSettings,
  placeholders: Record<string, string>,
  elementType: "node" | "link"
): string {
  if (settings.tooltipMode === "minimal") {
    return `${placeholders.name}: ${placeholders.value}`;
  }

  if (settings.tooltipMode === "custom") {
    return buildTooltipHtml(settings.tooltipTemplate, placeholders);
  }

  // "detailed" mode
  if (elementType === "node") {
    return `<b>${placeholders.name}</b><br>${placeholders.value} (${placeholders.percentage}%)`;
  }
  return `<b>${placeholders.source}</b> \u2192 <b>${placeholders.target}</b><br>${placeholders.value} (${placeholders.percentage}%)`;
}

/**
 * Handle click events — supports both link and node clicks.
 * Supports select, filter, and filterConnected click actions.
 */
export function onClick(
  e: MouseEvent,
  selectedTupleIds: Map<number, boolean>,
  hoveredTupleIds: Map<number, boolean>,
  layoutLinks: SankeyLink[],
  settings?: ExtensionSettings
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

  const elem = d3.select(element);
  const isNode = element.classList?.contains("node");
  const isLink = element.classList?.contains("link");

  if (isNode) {
    const nodeData = elem.datum() as SankeyNode;
    const clickAction = settings?.clickAction ?? "select";

    if (clickAction === "filter" || clickAction === "filterConnected") {
      // Filter actions: collect tupleIds and apply filter via Tableau API
      const idsToFilter = new Set<number>();

      if (clickAction === "filterConnected") {
        const connected = getConnectedPaths(nodeData.id, layoutLinks);
        for (const id of connected) idsToFilter.add(id);
      } else {
        for (const link of layoutLinks) {
          const sourceId = typeof link.source === "string" ? link.source : link.source.id;
          const targetId = typeof link.target === "string" ? link.target : link.target.id;
          if (sourceId === nodeData.id || targetId === nodeData.id) {
            const ids = link.tupleIds || [link.tupleId];
            for (const id of ids) idsToFilter.add(id);
          }
        }
      }

      if (!e.ctrlKey) selectedTupleIds.clear();
      for (const id of idsToFilter) selectedTupleIds.set(id, true);
    } else {
      // Default "select" behavior
      if (!e.ctrlKey) selectedTupleIds.clear();

      for (const link of layoutLinks) {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id;
        const targetId = typeof link.target === "string" ? link.target : link.target.id;

        if (sourceId === nodeData.id || targetId === nodeData.id) {
          const ids = link.tupleIds || [link.tupleId];
          for (const id of ids) selectedTupleIds.set(id, true);
        }
      }
    }
  } else if (isLink) {
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
  linksPerTupleId: Map<number, any[]>,
  hoveringLayer: any,
  settings: ExtensionSettings,
  totalLinkValue: number,
  layoutLinks: SankeyLink[],
  hiddenLabelNodeIds: Set<number> = new Set()
): Promise<void> {
  const element = document.elementFromPoint(
    e.pageX,
    e.pageY
  ) as Element;

  const isNode = element?.classList?.contains("node");
  const isLink = element?.classList?.contains("link");

  const hadHoveredTupleBefore = hoveredTupleIds.size !== 0;

  clearHoveredMarks(hoveredTupleIds);

  if (isNode && element) {
    const elem = d3.select(element);
    const nodeData = elem.datum() as SankeyNode;

    // Path tracing: highlight all connected paths recursively
    const connectedIds = getConnectedPaths(
      nodeData.id,
      layoutLinks
    );
    for (const id of connectedIds) {
      hoveredTupleIds.set(id, true);
    }

    const nodeValue = nodeData.value || 0;
    const isLabelHidden = nodeData.index !== undefined &&
      hiddenLabelNodeIds.has(nodeData.index);

    if (settings.showPercentages || isLabelHidden) {
      const percentage =
        totalLinkValue > 0
          ? ((nodeValue / totalLinkValue) * 100).toFixed(1)
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

    // Hover first tupleId for Tableau tooltip
    const firstId = connectedIds.values().next().value;
    if (firstId !== undefined) {
      getWorksheet().hoverTupleAsync(firstId, {
        tooltipAnchorPoint: { x: e.pageX, y: e.pageY },
      });
    }
  } else if (isLink && element) {
    const elem = d3.select(element);
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
        totalLinkValue > 0
          ? ((data.value / totalLinkValue) * 100).toFixed(1)
          : "0";
      const placeholders = {
        name: `${sourceName} \u2192 ${targetName}`,
        value: data.value.toLocaleString(),
        percentage,
        source: sourceName,
        target: targetName,
        level: "",
      };
      const tooltipHtml = getTooltipContent(settings, placeholders, "link");
      showTooltip(e.pageX, e.pageY, tooltipHtml);
    } else {
      hideTooltip();
    }

    getWorksheet().hoverTupleAsync(data.tupleId, {
      tooltipAnchorPoint: { x: e.pageX, y: e.pageY },
    });
  } else {
    hideTooltip();

    if (hadHoveredTupleBefore) {
      getWorksheet().hoverTupleAsync(0, {
        tooltipAnchorPoint: { x: e.pageX, y: e.pageY },
      });
    }
  }

  renderHoveredElements(
    hoveredTupleIds,
    linksPerTupleId,
    hoveringLayer
  );
}

import * as d3 from "d3";
import { SankeyLink, SankeyNode } from "./sankey-utils";
import { selectTuples, clearHoveredMarks, getWorksheet } from "./tableau-utils";

/**
 * Get links per tuple ID for selection handling
 */
export function getLinksPerTupleId(links: any): Map<number, any[]> {
  const linksPerTupleId = new Map<number, any[]>();
  links.each(function (this: any, d: SankeyLink) {
    let list = linksPerTupleId.get(d.tupleId);
    if (!list) {
      list = [];
      linksPerTupleId.set(d.tupleId, list);
    }
    list.push(d3.select(this));
  });

  return linksPerTupleId;
}

/**
 * Get selected nodes from selected links
 */
export function getSelectedNodes(
  links: SankeyLink[],
  selectedTupleIds: Map<number, boolean>
): Map<number, boolean> {
  const selectedNodeIndexes = new Map<number, boolean>();

  for (const link of links) {
    if (selectedTupleIds.has(link.tupleId)) {
      const sourceNode = typeof link.source === "string" ? null : link.source;
      const targetNode = typeof link.target === "string" ? null : link.target;

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

  // Render the outline first (to dissolve selected elements borders)
  if (outline.empty()) {
    outline = selectionLayer.append("g").attr("class", "selectionOutline");
  }

  outline
    .selectAll()
    .data(selectedLinks)
    .join("path")
    .attr("d", (link: any) => link.attr("d")) // Copy path geometry from the 'normal' element
    .datum((link: any) => link.datum()); // Bind data from the 'normal' element

  // Render filled elements without borders
  let fill = selectionLayer.selectAll("g.selection");

  if (fill.empty()) {
    fill = selectionLayer.append("g").attr("class", "selection");
  }

  fill
    .selectAll()
    .data(selectedLinks)
    .join("path")
    .attr("d", (link: any) => link.attr("d")) // Copy path geometry from the 'normal' element
    .datum((link: any) => link.datum()); // Bind data from the 'normal' element
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
 * Handle click events
 */
export function onClick(
  e: MouseEvent,
  selectedTupleIds: Map<number, boolean>,
  hoveredTupleIds: Map<number, boolean>
): void {
  const elem = d3.select(
    document.elementFromPoint(e.pageX, e.pageY) as Element
  );
  const data = elem?.datum() as SankeyLink | undefined;
  const tupleId = data?.tupleId;

  if (elem && tupleId !== undefined) {
    if (selectedTupleIds.has(tupleId)) {
      // User clicked on an already selected item
      // Only one item is selected - deselect it
      if (selectedTupleIds.size === 1) selectedTupleIds.clear();
      // Remove an item from selection
      else if (e.ctrlKey) selectedTupleIds.delete(tupleId);
      else {
        selectedTupleIds.clear();
        selectedTupleIds.set(tupleId, true);
      }
    } else {
      if (!e.ctrlKey) selectedTupleIds.clear();
      selectedTupleIds.set(tupleId, true);
    }
  } else if (!e.ctrlKey) {
    // Clicking outside of any element will clear all elements, unless CTRL is pressed
    selectedTupleIds.clear();
  }

  selectTuples(e.pageX, e.pageY, selectedTupleIds, hoveredTupleIds);
}

/**
 * Handle mouse move events
 */
export async function onMouseMove(
  e: MouseEvent,
  hoveredTupleIds: Map<number, boolean>,
  linksPerTupleId: Map<number, any[]>,
  hoveringLayer: any
): Promise<void> {
  const elem = d3.select(
    document.elementFromPoint(e.pageX, e.pageY) as Element
  );
  const data = elem?.node() ? (elem.datum() as SankeyLink) : undefined;
  const tupleId = data?.tupleId;

  const hadHoveredTupleBefore = hoveredTupleIds.size !== 0;

  clearHoveredMarks(hoveredTupleIds);

  if (elem && tupleId !== undefined) {
    hoveredTupleIds.set(tupleId, true);
    getWorksheet().hoverTupleAsync(tupleId, {
      tooltipAnchorPoint: { x: e.pageX, y: e.pageY },
    });
  } else if (hadHoveredTupleBefore) {
    getWorksheet().hoverTupleAsync(tupleId || 0, {
      tooltipAnchorPoint: { x: e.pageX, y: e.pageY },
    });
  }

  renderHoveredElements(hoveredTupleIds, linksPerTupleId, hoveringLayer);
}

import * as d3 from "d3";
import tinycolor from "tinycolor2";
import { SankeyLink } from "./sankey-utils";

const backgroundColor = tinycolor("white");

/**
 * Get link color
 */
export function getLinkColor(
  link: SankeyLink,
  selectedTupleIds: Map<number, boolean>
): string {
  const sourceId =
    typeof link.source === "string" ? link.source : link.source.id;
  const color = d3.scaleOrdinal(d3.schemeCategory10);
  const baseColor = color(sourceId);

  if (selectedTupleIds.has(link.tupleId)) {
    return baseColor;
  } else {
    return computeFoggedBackgroundColor(baseColor, 0.3);
  }
}

/**
 * Get color with selection handling
 */
export function getColor(
  color: string | number,
  selectedTupleIds: Map<number, boolean>,
  doNotFog: boolean
): string {
  if (doNotFog) {
    return color.toString();
  }

  if (selectedTupleIds.size === 0) {
    return color.toString();
  }

  return computeFoggedBackgroundColor(color.toString(), 0.3);
}

/**
 * Compute fogged background color
 */
export function computeFoggedBackgroundColor(
  color: string,
  fogBlendFactor: number
): string {
  const fogColor = calculateFogColor(backgroundColor);
  const colorObj = tinycolor(color);
  const foggedColor = tinycolor.mix(colorObj, fogColor, fogBlendFactor * 100);
  return foggedColor.toHexString();
}

/**
 * Calculate fog color
 */
export function calculateFogColor(colorStr: any): string {
  const color = tinycolor(colorStr);
  return color.isLight() ? "#000000" : "#ffffff";
}

/**
 * Get fog blend factor
 */
export function getFogBlendFactor(color: string): number {
  const colorObj = tinycolor(color);
  return colorObj.isLight() ? 0.3 : 0.7;
}

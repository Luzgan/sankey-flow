import tinycolor from "tinycolor2";
import { SELECTION_BLEND_FACTOR } from "./constants";

const backgroundColor = tinycolor("white");

/**
 * Get color with selection-based fogging
 */
export function getColor(
  color: string | number,
  selectedTupleIds: Map<number, boolean>,
  doNotFog: boolean
): string {
  if (doNotFog || selectedTupleIds.size === 0) {
    return color.toString();
  }

  return computeFoggedBackgroundColor(color.toString(), SELECTION_BLEND_FACTOR);
}

/**
 * Generate a CSS-safe gradient ID from source and target node IDs
 */
export function getGradientId(sourceId: string, targetId: string): string {
  const safe = (s: string): string => s.replace(/[^a-zA-Z0-9]/g, "_");
  return `grad-${safe(sourceId)}-${safe(targetId)}`;
}

/**
 * Compute fogged background color by blending with fog
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
 * Calculate fog color (opposite luminance)
 */
export function calculateFogColor(colorStr: tinycolor.Instance): string {
  return colorStr.isLight() ? "#000000" : "#ffffff";
}

/**
 * Return a label color that contrasts with the given background.
 * Used when labels are rendered on top of node rectangles.
 */
export function getContrastingLabelColor(bgColor: string): string {
  return tinycolor(bgColor).isLight() ? "#000000" : "#ffffff";
}

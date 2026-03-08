import { EncodingMap, RowData } from "./tableau-utils";

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the current configuration for Sankey visualization requirements
 */
export function validateSankeyConfiguration(
  encodingMap: EncodingMap,
  summaryData: RowData[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  const levelFields = encodingMap.level || [];
  const edgeFields = encodingMap.edge || [];
  const colorFields = encodingMap.color || [];

  // Sankey requires minimum 2 level fields (up to 5) and 1 edge field
  if (levelFields.length < 2) {
    errors.push(
      `Sankey visualization requires at least 2 level fields. Currently configured: ${levelFields.length}`
    );
  } else if (levelFields.length > 5) {
    errors.push(
      `Sankey visualization supports up to 5 level fields. Currently configured: ${levelFields.length}`
    );
  } else if (levelFields.length > 3) {
    warnings.push(
      `Sankey visualization works best with 2-3 level fields. Currently configured: ${levelFields.length}`
    );
  }

  if (edgeFields.length < 1) {
    errors.push(
      `Sankey visualization requires exactly 1 edge field. Currently configured: ${edgeFields.length}`
    );
  } else if (edgeFields.length > 1) {
    warnings.push(
      `Sankey visualization works best with exactly 1 edge field. Currently configured: ${edgeFields.length}`
    );
  }

  // Color encoding is optional (0-1 fields)
  if (colorFields.length > 1) {
    warnings.push(
      `Color encoding supports at most 1 field. Currently configured: ${colorFields.length}. Only the first will be used.`
    );
  }

  // Check if we have data
  if (summaryData.length === 0) {
    errors.push("No data available. Please ensure your worksheet has data.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

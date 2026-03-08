import {
  Worksheet,
  DataTableReader,
  DataTable,
  DataValue,
  Field,
  VisualSpecification,
  MarksSpecification,
  Encoding,
} from "@tableau/extensions-api-types";

export interface EncodingMap {
  level?: Field[];
  edge?: Field[];
  color?: Field[];
}

export type RowData = { tupleId: number } & {
  [key: string]: DataValue;
};

/**
 * Get encoding map from visual specification
 */
export async function getEncodingMap(): Promise<EncodingMap> {
  const worksheet = tableau.extensions.worksheetContent?.worksheet;
  if (!worksheet) throw new Error("Worksheet not found");

  const visualSpec = await worksheet.getVisualSpecificationAsync();

  const encodingMap: EncodingMap = {};

  if (visualSpec.activeMarksSpecificationIndex < 0) {
    return encodingMap;
  }

  const marksCard =
    visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
  for (const encoding of marksCard.encodings) {
    if (!encodingMap[encoding.id as keyof EncodingMap]) {
      encodingMap[encoding.id as keyof EncodingMap] = [];
    }

    (encodingMap[encoding.id as keyof EncodingMap] as Field[]).push(
      encoding.field as any
    );
  }

  return encodingMap;
}

/**
 * Get summary data table from worksheet
 */
export async function getSummaryDataTable(
  worksheet: Worksheet
): Promise<RowData[]> {
  let rows: RowData[] = [];

  // Fetch the summary data using the DataTableReader
  const dataTableReader = await worksheet.getSummaryDataReaderAsync(100, {
    ignoreSelection: true,
  });

  // Get all pages of data
  let pageIndex = 0;
  while (pageIndex < dataTableReader.pageCount) {
    const page = await dataTableReader.getPageAsync(pageIndex);
    if (!page || page.data.length === 0) break;
    rows = rows.concat(convertToListOfNamedRows(page));
    pageIndex++;
  }

  return rows;
}

/**
 * Get selection from worksheet
 */
export async function getSelection(
  worksheet: Worksheet,
  allMarks: RowData[]
): Promise<Map<number, boolean>> {
  const selectedMarks = await worksheet.getSelectedMarksAsync();

  return findIdsOfSelectedMarks(allMarks, selectedMarks);
}

/**
 * Find IDs of selected marks
 */
export function findIdsOfSelectedMarks(
  allMarks: RowData[],
  selectedMarks: any
): Map<number, boolean> {
  if (!selectedMarks.data || selectedMarks.data.length === 0) {
    return new Map();
  }

  const columns = selectedMarks.data[0].columns;
  const selectedMarkMap = new Map<string, any>();
  const selectedMarksIds = new Map<number, boolean>();

  for (const selectedMark of convertToListOfNamedRows(selectedMarks.data[0])) {
    let key = "";
    for (const col of columns) {
      key += selectedMark[col.fieldName].value + "\x00";
    }

    selectedMarkMap.set(key, selectedMark);
  }

  let tupleId = 1;
  for (const mark of allMarks) {
    let key = "";
    for (const col of columns) {
      key += mark[col.fieldName].value + "\x00";
    }

    if (selectedMarkMap.has(key)) {
      selectedMarksIds.set(tupleId, true);
    }

    tupleId++;
  }

  return selectedMarksIds;
}

/**
 * Convert data table page to list of named rows
 */
export function convertToListOfNamedRows(dataTablePage: DataTable): RowData[] {
  const rows: RowData[] = [];
  const columns = dataTablePage.columns;
  const data = dataTablePage.data;
  for (let i = 0; i < data.length; ++i) {
    const row: RowData = { tupleId: i + 1 } as RowData;
    for (let j = 0; j < columns.length; ++j) {
      row[columns[j].fieldName] = data[i][columns[j].index];
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Select tuples in Tableau
 */
export async function selectTuples(
  x: number,
  y: number,
  selectedTupleIds: Map<number, boolean>,
  hoveredTupleIds: Map<number, boolean>
): Promise<void> {
  clearHoveredMarks(hoveredTupleIds);
  getWorksheet().selectTuplesAsync(
    [...selectedTupleIds.keys()],
    tableau.SelectOptions.Simple,
    { tooltipAnchorPoint: { x, y } }
  );
}

/**
 * Clear hovered marks
 */
export function clearHoveredMarks(hoveredTupleIds: Map<number, boolean>): void {
  hoveredTupleIds.clear();
}

/**
 * Get worksheet reference
 */
export function getWorksheet(): Worksheet {
  const worksheet = tableau.extensions.worksheetContent?.worksheet;
  if (!worksheet) throw new Error("Worksheet not found");
  return worksheet;
}

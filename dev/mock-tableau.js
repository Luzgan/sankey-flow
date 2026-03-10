/**
 * Mock Tableau Extensions API for standalone development/testing.
 * Loaded in place of the real tableau.extensions.1.latest.min.js
 * when running via the dev server.
 *
 * Data is parsed from sample-data.csv at startup.
 */

(function () {
  const SAMPLE_DATA_URL = "/sample-data.csv";

  // --- Event emitter ---
  const listeners = {};

  function addEventListener(type, handler) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(handler);
  }

  function removeEventListener(type, handler) {
    if (!listeners[type]) return;
    listeners[type] = listeners[type].filter((h) => h !== handler);
  }

  function emit(type) {
    (listeners[type] || []).forEach((h) => h());
  }

  // --- Settings store (synced via localStorage for cross-window communication) ---
  const STORAGE_KEY = "sankey-ext-settings";

  function loadSettingsFromStorage() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  }

  const settingsStore = loadSettingsFromStorage();

  // Listen for changes from other windows (config dialog)
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const updated = loadSettingsFromStorage();
    Object.keys(settingsStore).forEach((k) => delete settingsStore[k]);
    Object.assign(settingsStore, updated);
    console.log("[mock-tableau] Settings updated from another window:", settingsStore);
    emit("settings-changed");
  });

  const settings = {
    get(key) {
      return settingsStore[key];
    },
    set(key, value) {
      settingsStore[key] = value;
    },
    getAll() {
      return { ...settingsStore };
    },
    async saveAsync() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsStore));
      emit("settings-changed");
    },
    addEventListener(type, handler) {
      addEventListener(type, handler);
    },
    removeEventListener(type, handler) {
      removeEventListener(type, handler);
    },
  };

  // --- CSV parser (simple, handles quoted fields) ---
  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        rows.push(values);
      }
    }
    return { headers, rows };
  }

  function parseCsvLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  // --- Build Tableau-shaped data structures from CSV ---
  let cachedData = null;

  async function loadData() {
    if (cachedData) return cachedData;

    const response = await fetch(SAMPLE_DATA_URL);
    const text = await response.text();
    const { headers, rows } = parseCSV(text);

    // Columns metadata
    const columns = headers.map((name, index) => ({
      fieldName: name,
      index,
      dataType: "string",
    }));

    // Data as 2D array of {value, formattedValue}
    const data = rows.map((row) =>
      row.map((val) => {
        const num = val === "" ? NaN : Number(val);
        return {
          value: isNaN(num) ? val : num,
          formattedValue: String(val),
          nativeValue: isNaN(num) ? val : num,
        };
      })
    );

    cachedData = { columns, data };
    return cachedData;
  }

  // --- Visual specification (encoding map) ---
  // Simulates: Source, Category, Target → Stage encoding; Value → Edge encoding
  function buildVisualSpec(columns) {
    // Assume last column is the measure (edge), rest are dimensions (levels)
    const levelColumns = columns.slice(0, -1);
    const edgeColumn = columns[columns.length - 1];

    const encodings = [
      ...levelColumns.map((col) => ({
        id: "level",
        field: {
          name: col.fieldName,
          index: col.index,
          dataType: col.dataType,
        },
      })),
      {
        id: "edge",
        field: {
          name: edgeColumn.fieldName,
          index: edgeColumn.index,
          dataType: edgeColumn.dataType,
        },
      },
    ];

    return {
      activeMarksSpecificationIndex: 0,
      marksSpecifications: [{ encodings }],
    };
  }

  // --- DataTableReader mock ---
  function createDataTableReader(tableData, pageSize) {
    const totalRows = tableData.data.length;
    const pageCount = Math.ceil(totalRows / pageSize);

    return {
      pageCount,
      totalRowCount: totalRows,
      async getPageAsync(pageIndex) {
        const start = pageIndex * pageSize;
        const end = Math.min(start + pageSize, totalRows);
        return {
          columns: tableData.columns,
          data: tableData.data.slice(start, end),
          totalRowCount: totalRows,
          isTotalRowCountLimited: false,
        };
      },
      async releaseAsync() {},
    };
  }

  // --- Selection state ---
  let selectedTupleIds = [];

  // --- Worksheet mock ---
  const worksheet = {
    name: "Mock Worksheet",

    async getVisualSpecificationAsync() {
      const tableData = await loadData();
      return buildVisualSpec(tableData.columns);
    },

    async getSummaryDataReaderAsync(pageSize, _options) {
      const tableData = await loadData();
      return createDataTableReader(tableData, pageSize || 100);
    },

    async getSelectedMarksAsync() {
      if (selectedTupleIds.length === 0) {
        return { data: [] };
      }
      // Return selected rows in DataTable format
      const tableData = await loadData();
      const selectedData = selectedTupleIds
        .map((id) => tableData.data[id - 1])
        .filter(Boolean);
      return {
        data: [
          {
            columns: tableData.columns,
            data: selectedData,
          },
        ],
      };
    },

    async selectTuplesAsync(tupleIds, _selectOption, _options) {
      selectedTupleIds = tupleIds || [];
      console.log("[mock-tableau] selectTuplesAsync:", selectedTupleIds);
    },

    async hoverTupleAsync(tupleId, _options) {
      // No-op in mock — just log
    },

    addEventListener(type, handler) {
      addEventListener(type, handler);
    },

    removeEventListener(type, handler) {
      removeEventListener(type, handler);
    },
  };

  // --- Extensions mock ---
  const extensions = {
    worksheetContent: { worksheet },

    environment: {
      mode: "authoring",
      workbookFormatting: {
        formattingSheets: [
          {
            classNameKey: "tableau-worksheet",
            cssProperties: {
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: "normal",
              fontSize: "12px",
              fontStyle: "normal",
              textDecoration: "none",
              color: "#333",
            },
          },
        ],
      },
    },

    settings,

    ui: {
      async displayDialogAsync(url, payload, options) {
        console.log("[mock-tableau] displayDialogAsync:", url, options);
        // Open config in a new window for dev
        window.open(url, "config", `width=${options?.width || 550},height=${options?.height || 450}`);
        return "";
      },
      closeDialog(payload) {
        console.log("[mock-tableau] closeDialog:", payload);
        if (window.opener) window.close();
      },
    },

    async initializeAsync(options) {
      console.log("[mock-tableau] Extension initialized (mock)");
      // Pre-load data so it's cached
      await loadData();
      return;
    },

    async initializeDialogAsync() {
      console.log("[mock-tableau] Dialog initialized (mock)");
      return "";
    },
  };

  // --- Global tableau object ---
  window.tableau = {
    extensions,

    ClassNameKey: {
      Worksheet: "tableau-worksheet",
    },

    SelectOptions: {
      Simple: "simple",
    },

    TableauEventType: {
      SummaryDataChanged: "summary-data-changed",
      SettingsChanged: "settings-changed",
      FilterChanged: "filter-changed",
      MarkSelectionChanged: "mark-selection-changed",
    },

    ErrorCodes: {
      DialogClosedByUser: "dialog-closed-by-user",
    },
  };

  console.log("[mock-tableau] Tableau Extensions API mock loaded");
})();

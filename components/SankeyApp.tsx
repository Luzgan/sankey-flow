import React, { useState, useEffect, useCallback, useRef } from "react";
import { ErrorState } from "./ErrorState";
import { WarningBanner } from "./WarningBanner";
import { LoadingState } from "./LoadingState";
import { SankeyChart } from "./SankeyChart";
import { ConfigPanel } from "./ConfigPanel";
import { ValidationResult } from "../utils/validation-utils";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import {
  TableauSettings,
  getTableauEventType,
  isAuthoringMode,
} from "../utils/tableau-api-utils";
import {
  ExtensionSettings,
  DEFAULT_SETTINGS,
} from "../utils/constants";
import type { SankeyLink } from "../utils/sankey-utils";

interface SankeyAppProps {
  worksheet: any;
  getStyles: () => any;
}

export const SankeyApp: React.FC<SankeyAppProps> = ({
  worksheet,
  getStyles,
}) => {
  const [styles, setStyles] = useState<any>(getStyles);
  const [summaryData, setSummaryData] = useState<RowData[]>([]);
  const [encodingMap, setEncodingMap] = useState<EncodingMap>({});
  const [selectedMarks, setSelectedMarks] = useState<
    Map<number, boolean>
  >(new Map());
  const [hoveredMarks, setHoveredMarks] = useState<
    Map<number, boolean>
  >(new Map());
  const [validation, setValidation] =
    useState<ValidationResult | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hoveringLayer, setHoveringLayer] = useState<any>(null);
  const [flowsPerTupleId, setFlowsPerTupleId] = useState<
    Map<number, any[]>
  >(new Map());
  const [totalFlowValue, setTotalFlowValue] = useState(0);
  const [layoutFlows, setLayoutFlows] = useState<SankeyLink[]>([]);
  const [hiddenLabelNodeIds, setHiddenLabelNodeIds] = useState<Set<number>>(
    new Set()
  );
  const [settings, setSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);

  const [functionsLoaded, setFunctionsLoaded] = useState(false);
  const [importedFunctions, setImportedFunctions] =
    useState<any>(null);

  // Per-node color picker state
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const colorPickerNodeRef = useRef<string | null>(null);
  const colorPickerIsDropoffRef = useRef<boolean>(false);

  // Config panel state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  // Track whether we triggered the save to skip our own change listener
  const selfSaveRef = useRef(false);

  const loadSettingsFromTableau = useCallback(() => {
    const loaded: Partial<ExtensionSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<
      keyof ExtensionSettings
    >) {
      const value = TableauSettings.get(key);
      if (value !== undefined) {
        if (typeof DEFAULT_SETTINGS[key] === "boolean") {
          (loaded as any)[key] = value === "true";
        } else if (typeof DEFAULT_SETTINGS[key] === "number") {
          const parsed = Number(value);
          if (!isNaN(parsed)) (loaded as any)[key] = parsed;
        } else {
          (loaded as any)[key] = value;
        }
      }
    }
    setSettings({ ...DEFAULT_SETTINGS, ...loaded });
  }, []);

  // Listen for settings changes (skip if triggered by our own save)
  // Also re-read workbook formatting — common workflow is changing fonts alongside settings
  useEffect(() => {
    const cleanup = TableauSettings.addChangeListener(() => {
      if (window.__sankeyDragSaving) return;
      if (selfSaveRef.current) {
        selfSaveRef.current = false;
        return;
      }
      loadSettingsFromTableau();
      setStyles(getStyles());
    });

    return cleanup;
  }, [loadSettingsFromTableau, getStyles]);

  // Listen for worksheet formatting changes (font, color, etc.)
  useEffect(() => {
    const eventType = getTableauEventType();
    if (!eventType?.WorkbookFormattingChanged) return;

    const handleFormattingChange = () => {
      setStyles(getStyles());
    };

    // The WorkbookFormattingChanged event is on the dashboard object for dashboard
    // extensions and on worksheetContent for viz extensions. The types don't expose
    // addEventListener on all possible targets, so we use any to attach safely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tableau API event target varies by extension type
    const target = (tableau.extensions as any).worksheetContent ?? (tableau.extensions as any).dashboardContent?.dashboard;
    if (!target?.addEventListener) return;

    let unregister: (() => void) | undefined;
    try {
      unregister = target.addEventListener(
        eventType.WorkbookFormattingChanged,
        handleFormattingChange
      );
    } catch {
      // Event may not be available in older Tableau versions or mock
      return;
    }

    return () => {
      if (typeof unregister === "function") {
        unregister();
      }
    };
  }, [getStyles]);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const { getSummaryDataTable, getEncodingMap, getSelection } =
          await import("../utils/tableau-utils");
        const { validateSankeyConfiguration } = await import(
          "../utils/validation-utils"
        );
        const { onClick, onMouseMove } = await import(
          "../utils/interaction-utils"
        );

        setImportedFunctions({
          getSummaryDataTable,
          getEncodingMap,
          getSelection,
          validateSankeyConfiguration,
          onClick,
          onMouseMove,
        });
        setFunctionsLoaded(true);
      } catch (error) {
        console.error("Error loading dependencies:", error);
      }
    };

    loadDependencies();
  }, []);

  useEffect(() => {
    loadSettingsFromTableau();
  }, [loadSettingsFromTableau]);

  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  const handleRenderComplete = useCallback(
    (result: {
      hoveringLayer: any;
      flowsPerTupleId: Map<number, any[]>;
      totalFlowValue: number;
      layoutFlows: SankeyLink[];
      hiddenLabelNodeIds: Set<number>;
      dataWarnings: string[];
    }) => {
      setHoveringLayer(result.hoveringLayer);
      setFlowsPerTupleId(result.flowsPerTupleId);
      setTotalFlowValue(result.totalFlowValue);
      setLayoutFlows(result.layoutFlows);
      setHiddenLabelNodeIds(result.hiddenLabelNodeIds);
      setDataWarnings(result.dataWarnings);
    },
    []
  );

  const updateData = useCallback(
    async (isInitial = false) => {
      if (!functionsLoaded || !importedFunctions) {
        return;
      }

      // Re-read workbook formatting on every data update — picks up font changes
      setStyles(getStyles());

      const {
        getSummaryDataTable,
        getEncodingMap,
        getSelection,
        validateSankeyConfiguration,
      } = importedFunctions;

      if (isInitial) {
        setIsInitialLoading(true);
      }

      try {
        const [newSummaryData, newEncodingMap] = await Promise.all([
          getSummaryDataTable(worksheet),
          getEncodingMap(),
        ]);

        setSummaryData(newSummaryData);
        setEncodingMap(newEncodingMap);

        const validationResult = validateSankeyConfiguration(
          newEncodingMap,
          newSummaryData
        );
        setValidation(validationResult);

        if (!validationResult.isValid) {
          if (isInitial) {
            setIsInitialLoading(false);
          }
          return;
        }

        const newSelectedMarks = await getSelection(
          worksheet,
          newSummaryData
        );
        setSelectedMarks(newSelectedMarks);
      } catch (error) {
        console.error("Error updating data:", error);
      } finally {
        if (isInitial) {
          setIsInitialLoading(false);
        }
      }
    },
    [worksheet, functionsLoaded, importedFunctions]
  );

  useEffect(() => {
    if (worksheet && functionsLoaded) {
      updateData(true);
    }
  }, [worksheet, functionsLoaded, updateData]);

  // Set up event listeners
  useEffect(() => {
    if (!functionsLoaded || !importedFunctions) return;

    const { onClick, onMouseMove } = importedFunctions;

    const handleClick = async (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      // In authoring mode, clicking a node opens a color picker for per-node overrides
      if (isAuthoringMode()) {
        const element = document.elementFromPoint(e.pageX, e.pageY);
        if (element?.classList?.contains("node")) {
          e.preventDefault();
          e.stopPropagation();
          const d3 = await import("d3");
          const nodeData = d3.select(element).datum() as { id: string; name: string; color: string };
          if (nodeData?.name && colorPickerRef.current) {
            colorPickerNodeRef.current = nodeData.name;
            colorPickerIsDropoffRef.current = nodeData.id?.startsWith("dropoff-") ?? false;
            colorPickerRef.current.value = nodeData.color || "#4e79a7";
            // Position near the clicked node
            colorPickerRef.current.style.position = "fixed";
            colorPickerRef.current.style.left = `${e.clientX}px`;
            colorPickerRef.current.style.top = `${e.clientY}px`;
            colorPickerRef.current.click();
          }
          return;
        }
      }

      onClick(e, selectedMarks, hoveredMarks, layoutFlows);
      await updateData(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(
        e,
        hoveredMarks,
        flowsPerTupleId,
        hoveringLayer,
        settings,
        totalFlowValue,
        layoutFlows,
        hiddenLabelNodeIds
      );
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(
        e,
        hoveredMarks,
        flowsPerTupleId,
        hoveringLayer,
        settings,
        totalFlowValue,
        layoutFlows,
        hiddenLabelNodeIds
      );
    };

    document.body.addEventListener("click", handleClick);
    document.body.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.body.removeEventListener("click", handleClick);
      document.body.removeEventListener(
        "mousemove",
        handleMouseMove
      );
      document.body.removeEventListener("mouseout", handleMouseOut);
    };
  }, [
    functionsLoaded,
    importedFunctions,
    validation,
    selectedMarks,
    hoveredMarks,
    flowsPerTupleId,
    hoveringLayer,
    settings,
    totalFlowValue,
    layoutFlows,
    hiddenLabelNodeIds,
    updateData,
  ]);

  // Listen to worksheet data changes
  useEffect(() => {
    if (!worksheet) return;

    const handleDataChange = () => {
      updateData(false);
    };

    const eventType = getTableauEventType();
    if (eventType?.SummaryDataChanged) {
      worksheet.addEventListener(
        eventType.SummaryDataChanged,
        handleDataChange
      );

      return () => {
        worksheet.removeEventListener(
          eventType.SummaryDataChanged,
          handleDataChange
        );
      };
    }

    return () => {};
  }, [worksheet, updateData]);

  // Auto-save a single setting to Tableau immediately
  const handleSettingChange = useCallback(<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    selfSaveRef.current = true;
    TableauSettings.set(key, String(value));
    TableauSettings.save();
  }, []);

  // Auto-save multiple settings at once
  const handleBatchSettingChange = useCallback((changes: Partial<ExtensionSettings>): void => {
    setSettings((prev) => ({ ...prev, ...changes }));
    selfSaveRef.current = true;
    for (const [key, value] of Object.entries(changes)) {
      TableauSettings.set(key, String(value));
    }
    TableauSettings.save();
  }, []);

  const handleDismissOnboarding = useCallback(() => {
    TableauSettings.set("onboardingSeen", "true");
    TableauSettings.save();
    setSettings((prev) => ({ ...prev, onboardingSeen: true }));
  }, []);

  const handleNodeColorChange = useCallback((color: string) => {
    const nodeName = colorPickerNodeRef.current;
    if (!nodeName) return;

    const isDropoff = colorPickerIsDropoffRef.current;
    const settingKey = isDropoff ? "dropoffNodeColors" : "nodeColorOverrides";
    const currentJson = isDropoff ? settings.dropoffNodeColors : settings.nodeColorOverrides;

    let overrides: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(currentJson);
      overrides = (parsed && typeof parsed === "object") ? parsed as Record<string, string> : {};
    } catch {
      overrides = {};
    }
    overrides[nodeName] = color;
    const json = JSON.stringify(overrides);
    TableauSettings.set(settingKey, json);
    // Auto-enable node color overrides when picking a non-dropoff node color
    if (!isDropoff && !settings.enableNodeColorOverrides) {
      TableauSettings.set("enableNodeColorOverrides", "true");
    }
    TableauSettings.save();
    setSettings((prev) => ({
      ...prev,
      [settingKey]: json,
      ...(!isDropoff ? { enableNodeColorOverrides: true } : {}),
    }));
  }, [settings.nodeColorOverrides, settings.dropoffNodeColors, settings.enableNodeColorOverrides]);

  // Attach native 'change' event (fires once on picker close, not continuously)
  useEffect(() => {
    const picker = colorPickerRef.current;
    if (!picker) return;
    const handler = (e: Event) => {
      handleNodeColorChange((e.target as HTMLInputElement).value);
    };
    picker.addEventListener("change", handler);
    return () => picker.removeEventListener("change", handler);
  }, [handleNodeColorChange]);

  const isAuthoring = isAuthoringMode();

  const showOnboarding = !settings.onboardingSeen && !isInitialLoading &&
    validation && !validation.isValid;

  return (
    <>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "fixed",
        }}
      >
        {isInitialLoading ? (
          <LoadingState />
        ) : showOnboarding ? (
          <div className="onboarding-overlay">
            <div className="onboarding-card">
              <h2 className="onboarding-title">Welcome to Sankey Flow</h2>
              <div className="onboarding-steps">
                <div className="onboarding-step">
                  <div className="onboarding-step-number">1</div>
                  <div>
                    <strong>Add Stages</strong>
                    <p>Drag at least 2 dimensions to the <em>Stage</em> encoding to define columns</p>
                  </div>
                </div>
                <div className="onboarding-step">
                  <div className="onboarding-step-number">2</div>
                  <div>
                    <strong>Add a Measure</strong>
                    <p>Drag a measure to the <em>Flow</em> encoding to define flow sizes</p>
                  </div>
                </div>
                <div className="onboarding-step">
                  <div className="onboarding-step-number">3</div>
                  <div>
                    <strong>Configure (optional)</strong>
                    <p>Click the gear icon to customise colors and layout</p>
                  </div>
                </div>
              </div>
              <button className="onboarding-dismiss" onClick={handleDismissOnboarding}>
                Got it
              </button>
            </div>
          </div>
        ) : validation && !validation.isValid ? (
          <ErrorState validation={validation} />
        ) : (
          <>
            {isAuthoring && ((validation && validation.warnings.length > 0) || dataWarnings.length > 0) && (
              <WarningBanner validation={{
                isValid: true,
                errors: [],
                warnings: [
                  ...(validation?.warnings || []),
                  ...dataWarnings,
                ],
              }} />
            )}
            <SankeyChart
              summaryData={summaryData}
              encodingMap={encodingMap}
              selectedMarks={selectedMarks}
              styles={styles}
              settings={settings}
              onRenderComplete={handleRenderComplete}
            />
          </>
        )}
      </div>
      <input
        ref={colorPickerRef}
        type="color"
        style={{ opacity: 0, position: "fixed", pointerEvents: "none", width: 0, height: 0 }}
      />
      {isAuthoring && (
        <>
          <button
            className="cp-gear-btn"
            onClick={() => setIsConfigOpen((prev) => !prev)}
            title="Configure"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16.18 12.32a1.25 1.25 0 00.25 1.38l.04.04a1.52 1.52 0 11-2.15 2.15l-.04-.04a1.25 1.25 0 00-1.38-.25 1.25 1.25 0 00-.76 1.15v.12a1.52 1.52 0 01-3.03 0v-.06a1.25 1.25 0 00-.82-1.15 1.25 1.25 0 00-1.38.25l-.04.04a1.52 1.52 0 11-2.15-2.15l.04-.04a1.25 1.25 0 00.25-1.38 1.25 1.25 0 00-1.15-.76h-.12a1.52 1.52 0 010-3.03h.06a1.25 1.25 0 001.15-.82 1.25 1.25 0 00-.25-1.38l-.04-.04a1.52 1.52 0 112.15-2.15l.04.04a1.25 1.25 0 001.38.25h.06a1.25 1.25 0 00.76-1.15v-.12a1.52 1.52 0 013.03 0v.06a1.25 1.25 0 00.76 1.15 1.25 1.25 0 001.38-.25l.04-.04a1.52 1.52 0 112.15 2.15l-.04.04a1.25 1.25 0 00-.25 1.38v.06a1.25 1.25 0 001.15.76h.12a1.52 1.52 0 010 3.03h-.06a1.25 1.25 0 00-1.15.76z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <ConfigPanel
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            settings={settings}
            onSettingChange={handleSettingChange}
            onBatchSettingChange={handleBatchSettingChange}
          />
        </>
      )}
    </>
  );
};

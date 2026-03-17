import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { LUX_WHITEBOARD_0, LUX_WHITEBOARD_1, LUX_WHITEBOARD_2, LUX_WHITEBOARD_3, LUX_WHITEBOARD } from "../utils/lux-images";

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
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingExiting, setOnboardingExiting] = useState(false);
  const wasInvalidRef = useRef(false);
  const hasSeenOnboardingRef = useRef(false);


  const [functionsLoaded, setFunctionsLoaded] = useState(false);
  const [importedFunctions, setImportedFunctions] =
    useState<any>(null);

  // Per-node color picker state
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const colorPickerNodeRef = useRef<string | null>(null);
  const colorPickerIsDropoffRef = useRef<boolean>(false);

  // Config panel state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
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

  // Listen for context-menu "Configure" button
  useEffect(() => {
    const handler = () => setIsConfigOpen(true);
    document.body.addEventListener("open-config-panel", handler);
    return () => document.body.removeEventListener("open-config-panel", handler);
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

    const handleNodeClick = (e: Event) => {
      if (validation && !validation.isValid) return;
      const detail = (e as CustomEvent).detail as {
        name: string; id: string; color: string;
        clientX: number; clientY: number; pageX: number; pageY: number; ctrlKey: boolean;
      };
      const isEffectiveAuthoring = isAuthoringMode();

      if (isEffectiveAuthoring) {
        // Author mode: open color picker
        if (detail.name && colorPickerRef.current) {
          colorPickerNodeRef.current = detail.name;
          colorPickerIsDropoffRef.current = detail.id?.startsWith("dropoff-") ?? false;
          colorPickerRef.current.value = detail.color || "#4e79a7";
          colorPickerRef.current.style.position = "fixed";
          colorPickerRef.current.style.left = `${detail.clientX}px`;
          colorPickerRef.current.style.top = `${detail.clientY}px`;
          colorPickerRef.current.click();
        }
      } else {
        // Viewer mode: select/highlight connected flows
        onClick(
          { pageX: detail.pageX, pageY: detail.pageY, ctrlKey: detail.ctrlKey } as MouseEvent,
          selectedMarks, hoveredMarks, layoutFlows
        );
        updateData(false);
      }
    };

    const handleClick = async (e: MouseEvent) => {
      if (validation && !validation.isValid) return;
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

    document.body.addEventListener("node-click", handleNodeClick);
    document.body.addEventListener("click", handleClick);
    document.body.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.body.removeEventListener("node-click", handleNodeClick);
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


  const handleNodeColorChange = useCallback((color: string) => {
    const nodeName = colorPickerNodeRef.current;
    if (!nodeName) return;
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;

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

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!validation || isInitialLoading) return;
    if (!validation.isValid) {
      hasSeenOnboardingRef.current = true;
      wasInvalidRef.current = true;
    }
    if (validation.isValid && wasInvalidRef.current && hasSeenOnboardingRef.current) {
      wasInvalidRef.current = false;
      setOnboardingComplete(true);
      exitTimerRef.current = setTimeout(() => setOnboardingExiting(true), 1500);
    }
    if (!validation.isValid) {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setOnboardingComplete(false);
      setOnboardingExiting(false);
    }
  }, [validation, isInitialLoading]);

  const showOnboarding = !isInitialLoading &&
    ((validation && !validation.isValid) || (onboardingComplete && !onboardingExiting));

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
          <div className={`onboarding-overlay${onboardingComplete ? " onboarding-overlay--complete" : ""}`}>
            <div className={`onboarding-card${onboardingComplete ? " onboarding-card--complete" : ""}`}>
              {(() => {
                const luxImages = [LUX_WHITEBOARD_0, LUX_WHITEBOARD_1, LUX_WHITEBOARD_2, LUX_WHITEBOARD_3];
                const progress =
                  ((encodingMap.level?.length ?? 0) >= 1 ? 1 : 0) +
                  ((encodingMap.level?.length ?? 0) >= 2 ? 1 : 0) +
                  ((encodingMap.edge?.length ?? 0) >= 1 ? 1 : 0);
                return (
                  <img
                    src={luxImages[progress]}
                    alt="Lux mascot presenting a Sankey diagram"
                    className="onboarding-mascot"
                  />
                );
              })()}
              <h2 className="onboarding-title">Welcome to Sankey Flow</h2>
              <p style={{ margin: "-16px 0 24px", fontSize: "14px", color: "#666" }}>
                by <a href="https://lukholc.me" target="_blank" rel="noopener noreferrer" style={{ color: "#4e79a7", textDecoration: "none" }}>Łukasz Holc</a>
              </p>
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
                    <strong>Format (optional)</strong>
                    <p>Click <em>Format Extension</em> beneath the mark cards to customise colors, layout, and more</p>
                  </div>
                </div>
              </div>
              {onboardingComplete && (
                <div className="onboarding-ready">
                  Ready! Loading your Sankey...
                </div>
              )}
            </div>
          </div>
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
              isAuthoring={isAuthoring}
              isConfigOpen={isConfigOpen}
              onConfigToggle={() => setIsConfigOpen((prev) => !prev)}
              onAboutToggle={() => setIsAboutOpen((prev) => !prev)}
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
        <ConfigPanel
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          settings={settings}
          onSettingChange={handleSettingChange}
          onBatchSettingChange={handleBatchSettingChange}
        />
      )}
      {isAboutOpen && (
        <div className="about-overlay" onClick={() => setIsAboutOpen(false)}>
          <div className="about-panel" onClick={(e) => e.stopPropagation()}>
            <button className="about-close" onClick={() => setIsAboutOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1.707.293A1 1 0 0 0 .293 1.707L5.586 7 .293 12.293a1 1 0 1 0 1.414 1.414L7 8.414l5.293 5.293a1 1 0 0 0 1.414-1.414L8.414 7l5.293-5.293A1 1 0 0 0 12.293.293L7 5.586 1.707.293z"/>
              </svg>
            </button>
            <img
              src={LUX_WHITEBOARD}
              alt="Lux mascot"
              className="about-mascot"
            />
            <h2 className="about-title">Sankey Flow</h2>
            <p className="about-author">
              by <a href="https://lukholc.me" target="_blank" rel="noopener noreferrer">Łukasz Holc</a>
            </p>
            <p className="about-description">
              Interactive Sankey diagram extension for Tableau. Visualise how values flow, split, and merge across stages with gradient flows, smart labels, drag-to-reorder nodes, and more.
            </p>
            <a
              className="about-link"
              href="https://github.com/Luzgan/sankey-flow/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Need help or found a bug?
            </a>
            <div className="about-changelog">
              <h3 className="about-changelog-title">Changelog</h3>
              <div className="about-changelog-entry">
                <span className="about-changelog-version">v1.0.0</span>
                <span className="about-changelog-date">March 2026</span>
                <p>Initial release — multi-stage Sankey diagrams, gradient flows, drop-off mode, drag-to-reorder nodes, smart labels, colour overrides, tooltips, SVG/PNG export, and Tableau selection integration.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

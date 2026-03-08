import React, { useState, useEffect, useCallback } from "react";
import { ErrorState } from "./ErrorState";
import { WarningBanner } from "./WarningBanner";
import { LoadingState } from "./LoadingState";
import { SankeyChart } from "./SankeyChart";
import { ValidationResult } from "../utils/validation-utils";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import {
  TableauSettings,
  getTableauEventType,
} from "../utils/tableau-api-utils";
import {
  ExtensionSettings,
  DEFAULT_SETTINGS,
} from "../utils/constants";
import type { SankeyLink } from "../utils/sankey-utils";

interface SankeyAppProps {
  worksheet: any;
  styles: any;
}

export const SankeyApp: React.FC<SankeyAppProps> = ({
  worksheet,
  styles,
}) => {
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
  const [linksPerTupleId, setLinksPerTupleId] = useState<
    Map<number, any[]>
  >(new Map());
  const [totalLinkValue, setTotalLinkValue] = useState(0);
  const [layoutLinks, setLayoutLinks] = useState<SankeyLink[]>([]);
  const [hiddenLabelNodeIds, setHiddenLabelNodeIds] = useState<Set<number>>(
    new Set()
  );
  const [settings, setSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);

  const [functionsLoaded, setFunctionsLoaded] = useState(false);
  const [importedFunctions, setImportedFunctions] =
    useState<any>(null);

  const loadSettingsFromTableau = useCallback(() => {
    const loaded: Partial<ExtensionSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<
      keyof ExtensionSettings
    >) {
      const value = TableauSettings.get(key);
      if (value !== undefined) {
        if (typeof DEFAULT_SETTINGS[key] === "boolean") {
          (loaded as any)[key] = value === "true";
        } else {
          (loaded as any)[key] = value;
        }
      }
    }
    setSettings({ ...DEFAULT_SETTINGS, ...loaded });
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const cleanup = TableauSettings.addChangeListener(() => {
      loadSettingsFromTableau();
    });

    return cleanup;
  }, [loadSettingsFromTableau]);

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

  const handleRenderComplete = useCallback(
    (result: {
      hoveringLayer: any;
      linksPerTupleId: Map<number, any[]>;
      totalLinkValue: number;
      layoutLinks: SankeyLink[];
      hiddenLabelNodeIds: Set<number>;
    }) => {
      setHoveringLayer(result.hoveringLayer);
      setLinksPerTupleId(result.linksPerTupleId);
      setTotalLinkValue(result.totalLinkValue);
      setLayoutLinks(result.layoutLinks);
      setHiddenLabelNodeIds(result.hiddenLabelNodeIds);
    },
    []
  );

  const updateData = useCallback(
    async (isInitial = false) => {
      if (!functionsLoaded || !importedFunctions) {
        return;
      }

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

      onClick(e, selectedMarks, hoveredMarks, layoutLinks);
      await updateData(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(
        e,
        hoveredMarks,
        linksPerTupleId,
        hoveringLayer,
        settings,
        totalLinkValue,
        layoutLinks,
        hiddenLabelNodeIds
      );
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(
        e,
        hoveredMarks,
        linksPerTupleId,
        hoveringLayer,
        settings,
        totalLinkValue,
        layoutLinks,
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
    linksPerTupleId,
    hoveringLayer,
    settings,
    totalLinkValue,
    layoutLinks,
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
        ) : validation && !validation.isValid ? (
          <ErrorState validation={validation} />
        ) : (
          <>
            {validation && validation.warnings.length > 0 && (
              <WarningBanner validation={validation} />
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
    </>
  );
};

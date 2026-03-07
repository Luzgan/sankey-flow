import React, { useState, useEffect, useCallback } from "react";
import { ErrorState } from "./ErrorState";
import { WarningBanner } from "./WarningBanner";
import { LoadingState } from "./LoadingState";
import { SankeyChart } from "./SankeyChart";
import { ValidationResult } from "../utils/validation-utils";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import { TableauSettings, getTableauEventType } from "../utils/tableau-api-utils";

interface ExtensionSettings {
  colorScheme: "default" | "colorblind" | "monochrome";
}

interface SankeyAppProps {
  worksheet: any;
  styles: any;
}

export const SankeyApp: React.FC<SankeyAppProps> = ({ worksheet, styles }) => {
  // State management
  const [summaryData, setSummaryData] = useState<RowData[]>([]);
  const [encodingMap, setEncodingMap] = useState<EncodingMap>({});
  const [selectedMarks, setSelectedMarks] = useState<Map<number, boolean>>(
    new Map()
  );
  const [hoveredMarks, setHoveredMarks] = useState<Map<number, boolean>>(
    new Map()
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hoveringLayer, setHoveringLayer] = useState<any>(null);
  const [linksPerTupleId, setLinksPerTupleId] = useState<Map<number, any[]>>(
    new Map()
  );
  const [settings, setSettings] = useState<ExtensionSettings>({
    colorScheme: "default",
  });

  // Dynamic imports
  const [functionsLoaded, setFunctionsLoaded] = useState(false);
  const [importedFunctions, setImportedFunctions] = useState<any>(null);

  // Helper to load settings from Tableau
  const loadSettingsFromTableau = useCallback(() => {
    const colorScheme = TableauSettings.get("colorScheme");
    if (colorScheme) {
      setSettings({
        colorScheme: colorScheme as ExtensionSettings["colorScheme"],
      });
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const cleanup = TableauSettings.addChangeListener(() => {
      loadSettingsFromTableau();
    });
    
    return cleanup;
  }, [loadSettingsFromTableau]);

  useEffect(() => {
    // Dynamically import functions once
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

  // Load settings on component mount
  useEffect(() => {
    loadSettingsFromTableau();
  }, [loadSettingsFromTableau]);

  // Render complete handler - CRITICAL: Must use useCallback to prevent infinite loops
  const handleRenderComplete = useCallback(
    (result: { hoveringLayer: any; linksPerTupleId: Map<number, any[]> }) => {
      setHoveringLayer(result.hoveringLayer);
      setLinksPerTupleId(result.linksPerTupleId);
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

      // Only show loading for initial load
      if (isInitial) {
        setIsInitialLoading(true);
      }

      try {
        // Fetch data
        const [newSummaryData, newEncodingMap] = await Promise.all([
          getSummaryDataTable(worksheet),
          getEncodingMap(),
        ]);

        setSummaryData(newSummaryData);
        setEncodingMap(newEncodingMap);

        // Validate configuration
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

        // Get selection
        const newSelectedMarks = await getSelection(worksheet, newSummaryData);
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
      updateData(true); // Initial load - show loading
    }
  }, [worksheet, functionsLoaded, updateData]);

  // Set up event listeners
  useEffect(() => {
    if (!functionsLoaded || !importedFunctions) return;

    const { onClick, onMouseMove } = importedFunctions;

    const handleClick = async (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onClick(e, selectedMarks, hoveredMarks);
      await updateData(false); // User interaction - no loading
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(e, hoveredMarks, linksPerTupleId, hoveringLayer);
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (validation && !validation.isValid) return;

      onMouseMove(e, hoveredMarks, linksPerTupleId, hoveringLayer);
    };

    document.body.addEventListener("click", handleClick);
    document.body.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.body.removeEventListener("click", handleClick);
      document.body.removeEventListener("mousemove", handleMouseMove);
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
    updateData,
  ]);

  // Listen to worksheet data changes
  useEffect(() => {
    if (!worksheet) return;

    const handleDataChange = () => {
      updateData(false); // Data change - no loading
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
    
    // Return empty cleanup function if no event listener was added
    return () => {};
  }, [worksheet, updateData]);

  return (
    <>
      {/* Always render the main container to preserve React tree */}
      <div style={{ width: "100%", height: "100%", position: "fixed" }}>
        {/* Conditional rendering within the same tree */}
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

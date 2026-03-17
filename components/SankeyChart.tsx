import React, { useEffect, useRef, useState, useCallback } from "react";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import { ExtensionSettings } from "../utils/constants";
import type { SankeyLink } from "../utils/sankey-utils";

interface SankeyChartProps {
  summaryData: RowData[];
  encodingMap: EncodingMap;
  selectedMarks: Map<number, boolean>;
  styles: any;
  settings: ExtensionSettings;
  isAuthoring?: boolean;
  isConfigOpen?: boolean;
  onConfigToggle?: () => void;
  onAboutToggle?: () => void;
  onRenderComplete?: (result: {
    hoveringLayer: any;
    flowsPerTupleId: Map<number, any[]>;
    totalFlowValue: number;
    layoutFlows: SankeyLink[];
    hiddenLabelNodeIds: Set<number>;
    dataWarnings: string[];
  }) => void;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  summaryData,
  encodingMap,
  selectedMarks,
  styles,
  settings,
  isAuthoring,
  isConfigOpen,
  onConfigToggle,
  onAboutToggle,
  onRenderComplete,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const sankeyInstanceRef = useRef<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setShowExportMenu(false);
      closeTimerRef.current = null;
    }, 300);
  }, []);

  const handleExportSvg = useCallback(() => {
    if (!svgRef.current) return;
    import("../utils/export-utils").then(({ exportAsSvg }) => {
      const innerSvg = svgRef.current?.querySelector("svg") as SVGSVGElement | null;
      if (innerSvg) exportAsSvg(innerSvg);
    });
    setShowExportMenu(false);
  }, []);

  const handleExportPng = useCallback(() => {
    if (!svgRef.current) return;
    import("../utils/export-utils").then(({ exportAsPng }) => {
      const innerSvg = svgRef.current?.querySelector("svg") as SVGSVGElement | null;
      if (innerSvg) exportAsPng(innerSvg);
    });
    setShowExportMenu(false);
  }, []);

  // Clean up close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Dispatch resize after config panel transition to trigger chart redraw
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 260);
    return () => clearTimeout(timer);
  }, [isConfigOpen]);

  useEffect(() => {
    const renderChart = async () => {
      if (!svgRef.current || !summaryData.length) return;

      const { Sankey, getEncodedData, resolveLabelsPostRender } = await import(
        "../utils/sankey-utils"
      );

      const svg = svgRef.current;
      svg.innerHTML = "";

      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;

      try {
        const encodedData = getEncodedData(
          summaryData,
          encodingMap,
          settings
        );

        const dataWarnings = encodedData.warnings || [];

        const sankey = await Sankey(
          encodedData,
          encodingMap,
          width,
          height,
          selectedMarks,
          styles,
          settings
        );

        sankeyInstanceRef.current = sankey;
        svg.appendChild(sankey.viz);

        const hiddenLabelNodeIds = resolveLabelsPostRender(
          svg,
          sankey.layoutNodes
        );

        if (onRenderComplete) {
          onRenderComplete({
            hoveringLayer: sankey.hoveringLayer,
            flowsPerTupleId: sankey.flowsPerTupleId,
            totalFlowValue: sankey.totalFlowValue,
            layoutFlows: sankey.layoutFlows,
            hiddenLabelNodeIds,
            dataWarnings,
          });
        }
      } catch (error) {
        console.error("Error rendering Sankey chart:", error);
      }
    };

    renderChart();

    return () => {
      if (svgRef.current) {
        svgRef.current.innerHTML = "";
      }
      sankeyInstanceRef.current = null;
    };
  }, [
    summaryData,
    encodingMap,
    selectedMarks,
    styles,
    settings,
    onRenderComplete,
  ]);

  // Handle resize
  useEffect(() => {
    const handleResize = async () => {
      if (!svgRef.current || !sankeyInstanceRef.current) return;

      const svg = svgRef.current;
      svg.innerHTML = "";

      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;

      try {
        const { Sankey, getEncodedData, resolveLabelsPostRender } = await import(
          "../utils/sankey-utils"
        );

        const encodedData = getEncodedData(
          summaryData,
          encodingMap,
          settings
        );

        const dataWarnings = encodedData.warnings || [];

        const sankey = await Sankey(
          encodedData,
          encodingMap,
          width,
          height,
          selectedMarks,
          styles,
          settings
        );

        sankeyInstanceRef.current = sankey;
        svg.appendChild(sankey.viz);

        const hiddenLabelNodeIds = resolveLabelsPostRender(
          svg,
          sankey.layoutNodes
        );

        if (onRenderComplete) {
          onRenderComplete({
            hoveringLayer: sankey.hoveringLayer,
            flowsPerTupleId: sankey.flowsPerTupleId,
            totalFlowValue: sankey.totalFlowValue,
            layoutFlows: sankey.layoutFlows,
            hiddenLabelNodeIds,
            dataWarnings,
          });
        }
      } catch (error) {
        console.error("Error resizing Sankey chart:", error);
      }
    };

    window.addEventListener("resize", handleResize);
    return () =>
      window.removeEventListener("resize", handleResize);
  }, [
    summaryData,
    encodingMap,
    selectedMarks,
    styles,
    settings,
    onRenderComplete,
  ]);

  return (
    <div style={{
      width: isConfigOpen ? "calc(100% - 340px)" : "100%",
      height: "100%",
      position: "relative",
      transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
      <svg
        ref={svgRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
      <div
        className="toolbar-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isAuthoring && onConfigToggle && (
          <button
            className="toolbar-btn"
            data-tooltip="Configure"
            onClick={onConfigToggle}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16.18 12.32a1.25 1.25 0 00.25 1.38l.04.04a1.52 1.52 0 11-2.15 2.15l-.04-.04a1.25 1.25 0 00-1.38-.25 1.25 1.25 0 00-.76 1.15v.12a1.52 1.52 0 01-3.03 0v-.06a1.25 1.25 0 00-.82-1.15 1.25 1.25 0 00-1.38.25l-.04.04a1.52 1.52 0 11-2.15-2.15l.04-.04a1.25 1.25 0 00.25-1.38 1.25 1.25 0 00-1.15-.76h-.12a1.52 1.52 0 010-3.03h.06a1.25 1.25 0 001.15-.82 1.25 1.25 0 00-.25-1.38l-.04-.04a1.52 1.52 0 112.15-2.15l.04.04a1.25 1.25 0 001.38.25h.06a1.25 1.25 0 00.76-1.15v-.12a1.52 1.52 0 013.03 0v.06a1.25 1.25 0 00.76 1.15 1.25 1.25 0 001.38-.25l.04-.04a1.52 1.52 0 112.15 2.15l-.04.04a1.25 1.25 0 00-.25 1.38v.06a1.25 1.25 0 001.15.76h.12a1.52 1.52 0 010 3.03h-.06a1.25 1.25 0 00-1.15.76z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        )}
        <button
          className="toolbar-btn"
          data-tooltip="Export"
          onClick={() => setShowExportMenu(!showExportMenu)}
        >
          &#x2913;
        </button>
        {showExportMenu && (
          <div className="export-menu">
            <button onClick={handleExportSvg}>Export SVG</button>
            <button onClick={handleExportPng}>Export PNG</button>
          </div>
        )}
        {onAboutToggle && (
          <button
            className="toolbar-btn"
            data-tooltip="About"
            onClick={onAboutToggle}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

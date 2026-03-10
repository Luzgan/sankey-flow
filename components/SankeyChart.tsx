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
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
      <div
        className="export-button-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="export-button"
          onClick={() => setShowExportMenu(!showExportMenu)}
          title="Export chart"
        >
          &#x2913;
        </button>
        {showExportMenu && (
          <div className="export-menu">
            <button onClick={handleExportSvg}>Export SVG</button>
            <button onClick={handleExportPng}>Export PNG</button>
          </div>
        )}
      </div>
    </div>
  );
};

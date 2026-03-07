import React, { useEffect, useRef } from "react";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import { ExtensionSettings } from "./ConfigurationDialog";

interface SankeyChartProps {
  summaryData: RowData[];
  encodingMap: EncodingMap;
  selectedMarks: Map<number, boolean>;
  styles: any;
  settings: ExtensionSettings;
  onRenderComplete?: (result: {
    hoveringLayer: any;
    linksPerTupleId: Map<number, any[]>;
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

  useEffect(() => {
    const renderChart = async () => {
      if (!svgRef.current || !summaryData.length) return;

      // Dynamically import the sankey utilities
      const { Sankey } = await import("../utils/sankey-utils");
      const { getEncodedData } = await import("../utils/sankey-utils");

      // Clear previous content
      const svg = svgRef.current;
      svg.innerHTML = "";

      // Get dimensions
      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;

      try {
        // Get encoded data
        const encodedData = getEncodedData(summaryData, encodingMap);

        // Create Sankey visualization
        const sankey = await Sankey(
          encodedData,
          encodingMap,
          width,
          height,
          selectedMarks,
          styles,
          settings
        );

        // Store reference for cleanup
        sankeyInstanceRef.current = sankey;

        // Append to SVG
        svg.appendChild(sankey.viz);

        // Notify parent component
        if (onRenderComplete) {
          onRenderComplete({
            hoveringLayer: sankey.hoveringLayer,
            linksPerTupleId: sankey.linksPerTupleId,
          });
        }
      } catch (error) {
        console.error("Error rendering Sankey chart:", error);
      }
    };

    renderChart();

    // Cleanup function
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
      console.log("handleResize");
      if (!svgRef.current || !sankeyInstanceRef.current) return;

      // Re-render on resize
      const svg = svgRef.current;
      svg.innerHTML = "";
      console.log(svg.clientHeight);
      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;

      try {
        const { Sankey } = await import("../utils/sankey-utils");
        const { getEncodedData } = await import("../utils/sankey-utils");

        const encodedData = getEncodedData(summaryData, encodingMap);

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

        if (onRenderComplete) {
          onRenderComplete({
            hoveringLayer: sankey.hoveringLayer,
            linksPerTupleId: sankey.linksPerTupleId,
          });
        }
      } catch (error) {
        console.error("Error resizing Sankey chart:", error);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    summaryData,
    encodingMap,
    selectedMarks,
    styles,
    settings,
    onRenderComplete,
  ]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
};

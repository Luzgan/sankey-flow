import React, { useEffect, useRef } from "react";
import { EncodingMap, RowData } from "../utils/tableau-utils";
import { ExtensionSettings } from "../utils/constants";
import type { SankeyLink, SankeyNode } from "../utils/sankey-utils";

interface SankeyChartProps {
  summaryData: RowData[];
  encodingMap: EncodingMap;
  selectedMarks: Map<number, boolean>;
  styles: any;
  settings: ExtensionSettings;
  onRenderComplete?: (result: {
    hoveringLayer: any;
    linksPerTupleId: Map<number, any[]>;
    totalLinkValue: number;
    layoutLinks: SankeyLink[];
    hiddenLabelNodeIds: Set<number>;
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
            linksPerTupleId: sankey.linksPerTupleId,
            totalLinkValue: sankey.totalLinkValue,
            layoutLinks: sankey.layoutLinks,
            hiddenLabelNodeIds,
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
            linksPerTupleId: sankey.linksPerTupleId,
            totalLinkValue: sankey.totalLinkValue,
            layoutLinks: sankey.layoutLinks,
            hiddenLabelNodeIds,
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

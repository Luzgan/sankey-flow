/**
 * SVG and PNG export utilities for the Sankey chart
 */

/**
 * Inline computed styles into SVG elements for standalone export
 */
function inlineStyles(svgElement: SVGSVGElement): SVGSVGElement {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const elements = Array.from(clone.querySelectorAll("*"));

  for (const el of elements) {
    const computed = window.getComputedStyle(el as Element);
    const important = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-opacity",
      "fill-opacity",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-anchor",
      "text-decoration",
      "opacity",
      "display",
      "cursor",
    ];

    for (const prop of important) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        (el as SVGElement).style.setProperty(prop, value);
      }
    }
  }

  return clone;
}

/**
 * Export the SVG element as an SVG file download
 */
export function exportAsSvg(svgElement: SVGSVGElement, filename = "sankey-chart.svg"): void {
  const clone = inlineStyles(svgElement);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * Export the SVG element as a PNG file download
 */
export function exportAsPng(
  svgElement: SVGSVGElement,
  filename = "sankey-chart.png",
  scale = 2
): void {
  const clone = inlineStyles(svgElement);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);

  const width = svgElement.clientWidth || svgElement.viewBox.baseVal.width || 800;
  const height = svgElement.clientHeight || svgElement.viewBox.baseVal.height || 600;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
    }, "image/png");
  };

  img.src = url;
}

/**
 * Trigger a file download from a Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

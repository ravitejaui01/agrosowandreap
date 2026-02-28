import type { CoconutPlotRow } from "@/lib/supabase";

/** Escape for XML text content in KML */
function escapeKml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Build KML document for one or more plots. latlngs are [lat, lng]; KML coordinates are lon,lat,altitude. */
export function buildKmlForPlots(plots: CoconutPlotRow[], plotCodePrefix: string): string {
  const placemarks = plots
    .filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3)
    .map((p, i) => {
      const name = `${plotCodePrefix}-P${i + 1}`;
      const ring = p.latlngs!;
      const closed =
        ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring
          : [...ring, ring[0]];
      const coords = closed.map(([lat, lng]) => `${lng},${lat},0`).join(" ");
      return `  <Placemark>\n    <name>${escapeKml(name)}</name>\n    <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>\n  </Placemark>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeKml(plotCodePrefix)} Geoboundaries</name>
${placemarks.join("\n")}
  </Document>
</kml>`;
}

export function downloadKml(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/vnd.google-earth.kml+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".kml") ? filename : `${filename}.kml`;
  a.click();
  URL.revokeObjectURL(url);
}

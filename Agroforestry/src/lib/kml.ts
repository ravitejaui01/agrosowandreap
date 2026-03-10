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
export function buildKmlForPlots(plots: CoconutPlotRow[], plotCodePrefix: string, farmerData?: Record<string, any>): string {
  const placemarks = plots
    .filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3)
    .map((p, i) => {
      const plotNum = p.plotNumber ?? (i + 1);
      const name = `${plotCodePrefix}-P${plotNum}`;
      const ring = p.latlngs!;
      const closed =
        ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring
          : [...ring, ring[0]];
      const coords = closed.map(([lat, lng]) => `${lng},${lat},0`).join(" ");
      const farmerCode = escapeKml(String(farmerData?.id ?? farmerData?.farmer_code ?? farmerData?.farmer_id ?? plotCodePrefix));
      const description = `<b>Farmer Code:</b> ${farmerCode}`;
      
      return `    <Placemark>
      <name>${escapeKml(name)}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#plotStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    });
    
  const farmerCode = escapeKml(String(farmerData?.id ?? farmerData?.farmer_code ?? farmerData?.farmer_id ?? plotCodePrefix));
  const docDescription = `<b>Farmer Code:</b> ${farmerCode}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeKml(plotCodePrefix)} Geoboundaries</name>
    <description><![CDATA[${docDescription}]]></description>
    <Style id="plotStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>7f0000ff</color>
        <fill>1</fill>
      </PolyStyle>
    </Style>
${placemarks.join("\n")}
  </Document>
</kml>`;
}

/** Calculate approximate area of a polygon in hectares */
function calculatePlotArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  
  // Simple shoelace formula for area calculation
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  area += coords[coords.length - 1][0] * coords[0][1] - coords[0][0] * coords[coords.length - 1][1];
  
  // Convert to approximate hectares (very rough approximation)
  const areaInSquareMeters = Math.abs(area) * 111320 * 111320 * Math.cos(coords[0][0] * Math.PI / 180);
  return areaInSquareMeters / 10000;
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

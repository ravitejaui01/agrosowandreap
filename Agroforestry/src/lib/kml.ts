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
      const name = `${plotCodePrefix}-P${i + 1}`;
      const ring = p.latlngs!;
      const closed =
        ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring
          : [...ring, ring[0]];
      const coords = closed.map(([lat, lng]) => `${lng},${lat},0`).join(" ");
      
      // Calculate approximate area (simple polygon area calculation)
      const area = calculatePlotArea(ring);
      
      // Build detailed description
      const description = `
<b>Plot Details</b><br/>
<b>Farmer Code:</b> ${escapeKml(String(farmerData?.farmer_code || farmerData?.id || plotCodePrefix))}<br/>
<b>Farmer Name:</b> ${escapeKml(String(farmerData?.farmer_name || 'N/A'))}<br/>
<b>Plot Number:</b> ${i + 1}<br/>
<b>Area:</b> ${area.toFixed(2)} hectares<br/>
<b>Land Ownership:</b> ${escapeKml(String(farmerData?.land_ownership || farmerData?.ownership || 'N/A'))}<br/>
<b>Survey Number:</b> ${escapeKml(String(farmerData?.land_patta_survey_number || farmerData?.survey_number || 'N/A'))}<br/>
<b>Submission Date:</b> ${farmerData?.created_at ? new Date(String(farmerData.created_at)).toLocaleDateString() : 'N/A'}<br/>
<b>Status:</b> ${escapeKml(String(p.status || 'N/A'))}<br/>
      `.trim();
      
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
    
  const docDescription = `
<b>Farmer Information</b><br/>
<b>Farmer Code:</b> ${escapeKml(String(farmerData?.farmer_code || farmerData?.id || plotCodePrefix))}<br/>
<b>Farmer Name:</b> ${escapeKml(String(farmerData?.farmer_name || 'N/A'))}<br/>
<b>Total Plots:</b> ${plots.length}<br/>
<b>Generated:</b> ${new Date().toLocaleDateString()}<br/>
<b>Source:</b> Agroforestry Management System
  `.trim();
  
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

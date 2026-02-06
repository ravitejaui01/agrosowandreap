import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

if (typeof window !== "undefined") (window as unknown as { L: typeof L }).L = L;
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";

const defaultCenter: [number, number] = [17.4239, 78.4245];
const defaultZoom = 13;
const SQ_METERS_TO_ACRES = 0.000247105;

function getPolygonAreaAcres(latlngs: L.LatLng[]): number {
  if (latlngs.length < 3) return 0;
  const coords = latlngs.map((ll) => [ll.lng, ll.lat]) as [number, number][];
  coords.push(coords[0]);
  const poly = turfPolygon([coords]);
  const sqMeters = area(poly);
  return sqMeters * SQ_METERS_TO_ACRES;
}

function LocateControl({
  location,
}: {
  location: { lat: number; lng: number; accuracy?: number } | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (location && map) {
      map.flyTo([location.lat, location.lng], 16);
    }
  }, [location?.lat, location?.lng, map]);
  return null;
}

const POLYGON_STYLE = {
  color: "#1d4ed8",
  fillColor: "#2563eb",
  fillOpacity: 0.35,
  weight: 2,
};

/** Enable polygon drawing via Leaflet Draw's internal API (most reliable). */
function enablePolygonDrawFromControl(drawControl: L.Control.Draw | null): boolean {
  if (!drawControl) return false;
  const c = drawControl as unknown as { _toolbars?: Record<string, { _modes?: Record<string, { handler?: { enable: () => void } }> }> };
  const toolbars = c._toolbars;
  if (!toolbars) return false;
  for (const key of Object.keys(toolbars)) {
    const drawToolbar = toolbars[key];
    const polygonMode = drawToolbar?._modes?.["polygon"];
    if (polygonMode?.handler) {
      try {
        polygonMode.handler.enable();
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

/** Fallback: simulate click on the polygon toolbar button (search map container or document). */
function tryClickPolygonButton(container: HTMLElement): boolean {
  const btn = (container.querySelector(".leaflet-draw-draw-polygon") ?? document.querySelector(".leaflet-draw-draw-polygon")) as HTMLElement | null;
  if (btn) {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
    return true;
  }
  return false;
}

/** Start polygon drawing with a standalone handler (does not depend on toolbar). */
function startStandalonePolygonDraw(
  map: L.Map,
  _featureGroup: L.FeatureGroup,
  shapeOptions: L.PathOptions
): L.Handler | null {
  const LDraw = (L as unknown as { Draw?: { Polygon?: new (map: L.Map, options?: unknown) => L.Handler } }).Draw;
  if (!LDraw?.Polygon) return null;
  try {
    const handler = new LDraw.Polygon(map, {
      shapeOptions,
      allowIntersection: false,
      metric: true,
      guidelines: true,
    });
    handler.enable();
    return handler;
  } catch {
    return null;
  }
}

function DrawControl({
  location,
  onPolygonCreated,
  drawKey,
  loadPolygonLatlngs,
  loadPolygonKey,
  triggerPolygonDraw,
  onDrawModeActive,
}: {
  location?: { lat: number; lng: number; accuracy?: number };
  onPolygonCreated?: (areaAcres: number, latlngs: L.LatLng[]) => void;
  drawKey: number;
  loadPolygonLatlngs?: [number, number][];
  loadPolygonKey?: number;
  triggerPolygonDraw?: number;
  onDrawModeActive?: () => void;
}) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const standalonePolygonRef = useRef<L.Handler | null>(null);

  useEffect(() => {
    let cancelled = false;
    let drawControl: L.Control.Draw | null = null;
    let fg: L.FeatureGroup | null = null;
    let onCreated: (e: L.LeafletEvent) => void;
    let onEdited: (e: L.LeafletEvent) => void;

    const setup = () => {
      if (cancelled) return;
      try {
        fg = L.featureGroup().addTo(map);
        featureGroupRef.current = fg;

        onCreated = (e: L.LeafletEvent) => {
          const event = e as L.DrawEvents.Created;
          const layer = event.layer;
          fg?.addLayer(layer);
          let areaAcres = 0;
          if (event.layerType === "polygon" && layer instanceof L.Polygon) {
            const latlngs = layer.getLatLngs()[0] as L.LatLng[];
            areaAcres = getPolygonAreaAcres(latlngs);
            onPolygonCreated?.(areaAcres, latlngs);
          } else if (event.layerType === "rectangle" && layer instanceof L.Rectangle) {
            const latlngs = (layer as L.Rectangle).getLatLngs()[0] as L.LatLng[];
            areaAcres = getPolygonAreaAcres(latlngs);
            onPolygonCreated?.(areaAcres, latlngs);
          }
        };
        onEdited = (e: L.LeafletEvent) => {
          const event = e as L.DrawEvents.Edited;
          event.layers.eachLayer((layer) => {
            if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
              const latlngs = layer.getLatLngs()[0] as L.LatLng[];
              onPolygonCreated?.(getPolygonAreaAcres(latlngs), latlngs);
            }
          });
        };

        drawControl = new L.Control.Draw({
          position: "topright",
          draw: {
            polygon: {
              allowIntersection: false,
              shapeOptions: POLYGON_STYLE,
              metric: true,
              guidelines: true,
            },
            polyline: false,
            circle: false,
            rectangle: {
              shapeOptions: POLYGON_STYLE,
            },
            marker: false,
            circlemarker: false,
          },
          edit: {
            featureGroup: fg,
            edit: true,
            remove: true,
          },
        });
        map.addControl(drawControl);
        drawControlRef.current = drawControl;
        map.on(L.Draw.Event.CREATED, onCreated);
        map.on(L.Draw.Event.EDITED, onEdited);
      } catch (err) {
        console.warn("Leaflet draw control failed to load:", err);
        featureGroupRef.current = null;
      }
    };

    map.whenReady(setup);

    return () => {
      cancelled = true;
      if (typeof onCreated === "function") map.off(L.Draw.Event.CREATED, onCreated);
      if (typeof onEdited === "function") map.off(L.Draw.Event.EDITED, onEdited);
      if (drawControl) map.removeControl(drawControl);
      if (fg) map.removeLayer(fg);
      if (standalonePolygonRef.current) {
        try {
          standalonePolygonRef.current.disable();
        } catch {
          /* ignore */
        }
        standalonePolygonRef.current = null;
      }
      featureGroupRef.current = null;
      drawControlRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (drawKey > 0 && featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  }, [drawKey]);

  /* Load a polygon when user selects a plot for editing */
  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg || loadPolygonKey === undefined) return;
    fg.clearLayers();
    if (loadPolygonLatlngs && loadPolygonLatlngs.length >= 3) {
      const latlngs = loadPolygonLatlngs.map(([lat, lng]) => L.latLng(lat, lng));
      fg.addLayer(L.polygon(latlngs, POLYGON_STYLE));
    }
  }, [loadPolygonKey, loadPolygonLatlngs]);

  /* When parent requests "Start Editing", use standalone polygon handler only (most reliable). */
  useEffect(() => {
    if (triggerPolygonDraw == null || triggerPolygonDraw <= 0) return;
    let cancelled = false;
    const maxWait = 50;
    const intervalMs = 80;

    const disableDrawToolbar = () => {
      const c = drawControlRef.current as unknown as { _toolbars?: Record<string, { disable?: () => void }> };
      if (!c?._toolbars) return;
      for (const key of Object.keys(c._toolbars)) {
        try {
          c._toolbars[key].disable?.();
        } catch {
          /* ignore */
        }
      }
    };

    const tryEnable = (attempt = 0) => {
      if (cancelled) return;
      const fg = featureGroupRef.current;
      if (!fg) {
        if (attempt < maxWait) setTimeout(() => tryEnable(attempt + 1), intervalMs);
        return;
      }
      if (standalonePolygonRef.current) {
        try {
          standalonePolygonRef.current.disable();
        } catch {
          /* ignore */
        }
        standalonePolygonRef.current = null;
      }
      disableDrawToolbar();
      try {
        map.invalidateSize();
        const container = map.getContainer();
        if (container) {
          container.setAttribute("tabindex", "0");
          if (typeof container.focus === "function") container.focus();
        }
      } catch {
        /* ignore */
      }
      const handler = startStandalonePolygonDraw(map, fg, POLYGON_STYLE);
      if (handler) {
        standalonePolygonRef.current = handler;
        setTimeout(() => {
          if (!cancelled) onDrawModeActive?.();
        }, 100);
      } else if (attempt < maxWait) {
        setTimeout(() => tryEnable(attempt + 1), intervalMs);
      }
    };

    tryEnable(0);
    return () => {
      cancelled = true;
    };
  }, [triggerPolygonDraw, map, onDrawModeActive]);

  return null;
}

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface CoconutMapProps {
  location?: { lat: number; lng: number; accuracy?: number };
  className?: string;
  onPolygonCreated?: (areaAcres: number, latlngs: L.LatLng[]) => void;
  drawKey?: number;
  loadPolygonLatlngs?: [number, number][];
  loadPolygonKey?: number;
  /** Increment to programmatically start polygon drawing (e.g. when user clicks "Start Editing") */
  triggerPolygonDraw?: number;
  /** Called when polygon draw mode is actually active (use to show toast only when drawing will work) */
  onDrawModeActive?: () => void;
}

export function CoconutMap({
  location,
  className = "",
  onPolygonCreated,
  drawKey = 0,
  loadPolygonLatlngs,
  loadPolygonKey,
  triggerPolygonDraw,
  onDrawModeActive,
}: CoconutMapProps) {
  const center: [number, number] = location
    ? [location.lat, location.lng]
    : defaultCenter;

  return (
      <div
        className={className}
        style={{ width: "100%", height: 400, minHeight: 400, position: "relative" }}
      >
        <MapContainer
          center={center}
          zoom={location ? 16 : defaultZoom}
          scrollWheelZoom
          style={{ width: "100%", height: "100%", minHeight: 400 }}
          className="rounded-lg coconut-map-draw-container"
        >
          <TileLayer
            attribution="Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <LocateControl location={location} />
          <DrawControl
            location={location}
            onPolygonCreated={onPolygonCreated}
            drawKey={drawKey}
            loadPolygonLatlngs={loadPolygonLatlngs}
            loadPolygonKey={loadPolygonKey}
            triggerPolygonDraw={triggerPolygonDraw}
            onDrawModeActive={onDrawModeActive}
          />
          {location && (
            <Marker position={[location.lat, location.lng]} icon={markerIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Current Location</strong>
                  <br />
                  Lat: {location.lat.toFixed(6)}
                  <br />
                  Lng: {location.lng.toFixed(6)}
                  {location.accuracy != null && (
                    <>
                      <br />
                      Accuracy: {Math.round(location.accuracy)} m
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
  );
}

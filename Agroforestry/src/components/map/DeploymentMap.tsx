import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
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
  return area(poly) * SQ_METERS_TO_ACRES;
}

const POLYGON_STYLE = {
  color: "#b91c1c",
  fillColor: "#b45309",
  fillOpacity: 0.35,
  weight: 2,
};

function DrawControl({
  onPolygonCreated,
  drawKey,
  loadPolygonLatlngs,
  loadPolygonKey,
}: {
  onPolygonCreated?: (areaAcres: number, latlngs: L.LatLng[]) => void;
  drawKey: number;
  loadPolygonLatlngs?: [number, number][];
  loadPolygonKey?: number;
}) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    let drawControl: L.Control.Draw | null = null;
    let fg: L.FeatureGroup | null = null;
    let onCreated: (e: L.LeafletEvent) => void;
    let onEdited: (e: L.LeafletEvent) => void;
    try {
      fg = L.featureGroup().addTo(map);
      featureGroupRef.current = fg;

      onCreated = (e: L.LeafletEvent) => {
        const event = e as L.DrawEvents.Created;
        const layer = event.layer;
        fg?.addLayer(layer);
        if (event.layerType === "polygon" && layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          onPolygonCreated?.(getPolygonAreaAcres(latlngs), latlngs);
        } else if (event.layerType === "rectangle" && layer instanceof L.Rectangle) {
          const latlngs = (layer as L.Rectangle).getLatLngs()[0] as L.LatLng[];
          onPolygonCreated?.(getPolygonAreaAcres(latlngs), latlngs);
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
          rectangle: { shapeOptions: POLYGON_STYLE },
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
      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.EDITED, onEdited);

      return () => {
        map.off(L.Draw.Event.CREATED, onCreated);
        map.off(L.Draw.Event.EDITED, onEdited);
        if (drawControl) map.removeControl(drawControl);
        if (fg) map.removeLayer(fg);
        featureGroupRef.current = null;
      };
    } catch (err) {
      console.warn("Leaflet draw control failed:", err);
      featureGroupRef.current = null;
      return undefined;
    }
  }, [map]);

  useEffect(() => {
    if (drawKey > 0 && featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  }, [drawKey]);

  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg || loadPolygonKey === undefined) return;
    fg.clearLayers();
    if (loadPolygonLatlngs && loadPolygonLatlngs.length >= 3) {
      const latlngs = loadPolygonLatlngs.map(([lat, lng]) => L.latLng(lat, lng));
      fg.addLayer(L.polygon(latlngs, POLYGON_STYLE));
    }
  }, [loadPolygonKey, loadPolygonLatlngs]);

  return null;
}

export interface DeploymentMapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  onPolygonCreated?: (areaAcres: number, latlngs: L.LatLng[]) => void;
  drawKey?: number;
  loadPolygonLatlngs?: [number, number][];
  loadPolygonKey?: number;
}

export function DeploymentMap({
  className = "",
  center = defaultCenter,
  zoom = defaultZoom,
  onPolygonCreated,
  drawKey = 0,
  loadPolygonLatlngs,
  loadPolygonKey,
}: DeploymentMapProps) {
  return (
    <div className={className} style={{ width: "100%", height: 400, minHeight: 400 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: "100%", height: "100%", minHeight: 400 }}
        className="rounded-lg"
      >
        <TileLayer
          attribution="Esri, Maxar, Earthstar Geographics"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <DrawControl
          onPolygonCreated={onPolygonCreated}
          drawKey={drawKey}
          loadPolygonLatlngs={loadPolygonLatlngs}
          loadPolygonKey={loadPolygonKey}
        />
      </MapContainer>
    </div>
  );
}

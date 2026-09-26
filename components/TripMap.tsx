"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { TripMapStop } from "@/types/place";

type TripMapProps = {
  stops: TripMapStop[];
  compact?: boolean;
};

export function TripMap({ stops, compact = false }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.FeatureGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: !compact, zoomControl: !compact });
      const tileUrl = process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map);
      map.setView([20, 0], 2);
      mapRef.current = map;
      leafletRef.current = L;
      setMapReady(true);
    });

    return () => {
      disposed = true;
      markersRef.current?.remove();
      markersRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    const markers = L.featureGroup();
    stops.forEach((stop) => {
      const { lat, lng } = stop.place.coordinates;
      const marker = L.marker([lat, lng], {
        title: `Day ${stop.dayNumber}, stop ${stop.stopNumber}: ${stop.name}`,
        icon: L.divIcon({
          className: "leaflet-stop-marker",
          html: `<span class="map-stop-marker">${stop.dayNumber}.${stop.stopNumber}</span>`,
          iconSize: [38, 34],
          iconAnchor: [19, 17],
        }),
      });
      const popup = document.createElement("div");
      popup.className = "map-stop-info";
      const name = document.createElement("strong");
      name.textContent = stop.name;
      const day = document.createElement("span");
      day.textContent = `Day ${stop.dayNumber} · Stop ${stop.stopNumber}`;
      popup.append(name, day);
      if (stop.place.address) {
        const address = document.createElement("span");
        address.textContent = stop.place.address;
        popup.append(address);
      }
      const link = document.createElement("a");
      link.href = stop.place.openStreetMapUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open in OpenStreetMap ↗";
      popup.append(link);
      marker.bindPopup(popup);
      markers.addLayer(marker);
    });

    markers.addTo(map);
    markersRef.current = markers;
    if (stops.length === 1) {
      const { lat, lng } = stops[0].place.coordinates;
      map.setView([lat, lng], compact ? 12 : 14);
    } else if (stops.length > 1) {
      map.fitBounds(markers.getBounds().pad(0.12), { maxZoom: compact ? 12 : 15 });
    }

    return () => {
      markers.remove();
      if (markersRef.current === markers) markersRef.current = null;
    };
  }, [mapReady, stops]);

  return (
    <div className="trip-map-host">
      <div ref={containerRef} className={`trip-map trip-map-canvas${compact ? " trip-map-compact" : ""}`} aria-label="Map of itinerary stops" />
      {compact && mapReady && (
        <div className="map-navigation-controls" role="group" aria-label="Map navigation controls">
          <div className="map-zoom-controls" role="group" aria-label="Zoom map">
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" title="Zoom in">+</button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" title="Zoom out">−</button>
          </div>
          <div className="map-pan-controls" role="group" aria-label="Pan map">
            <button className="map-pan-north" type="button" onClick={() => mapRef.current?.panBy([0, -80], { animate: true })} aria-label="Pan north" title="Pan north">↑</button>
            <button className="map-pan-west" type="button" onClick={() => mapRef.current?.panBy([-80, 0], { animate: true })} aria-label="Pan west" title="Pan west">←</button>
            <span className="map-pan-center" aria-hidden="true" />
            <button className="map-pan-east" type="button" onClick={() => mapRef.current?.panBy([80, 0], { animate: true })} aria-label="Pan east" title="Pan east">→</button>
            <button className="map-pan-south" type="button" onClick={() => mapRef.current?.panBy([0, 80], { animate: true })} aria-label="Pan south" title="Pan south">↓</button>
          </div>
        </div>
      )}
    </div>
  );
}

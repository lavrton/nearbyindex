"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Layers, Minus, Plus, LocateFixed } from "lucide-react";
import type { SelectedLocation, SelectedCategory } from "./MapContainer";
import { HeatmapLayer } from "./HeatmapLayer";
import { categoryColors } from "@/components/score/CategoryScore";

interface MapViewProps {
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  selectedCategory: SelectedCategory | null;
}

const DEFAULT_CENTER: [number, number] = [13.405, 52.52]; // Berlin
const DEFAULT_ZOOM = 12;

export function MapView({
  selectedLocation,
  onLocationSelect,
  showHeatmap,
  onToggleHeatmap,
  selectedCategory,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const poiMarkers = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const styleUrl =
      process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
      "https://tiles.openfreemap.org/styles/liberty";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      // Auto-detect user location on first load (instant, no animation)
      if (!hasRequestedLocation.current && navigator.geolocation) {
        hasRequestedLocation.current = true;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            map.current?.jumpTo({
              center: [longitude, latitude],
              zoom: 14,
            });
          },
          (error) => {
            // Silently fail - user denied or geolocation unavailable
            // Map will stay at default location (Berlin)
            console.log("Geolocation not available:", error.message);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // Cache for 5 minutes
          }
        );
      }
    });

    map.current.on("click", (e) => {
      onLocationSelect({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [onLocationSelect]);

  // Update marker when selected location changes
  useEffect(() => {
    if (!map.current) return;

    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    if (selectedLocation) {
      marker.current = new maplibregl.Marker({ color: "#171717" })
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map.current);

      // Calculate padding to center point in visible area (accounting for UI panels)
      // ScorePanel: ~420px wide on left (desktop), ~300px tall on bottom (mobile)
      // SearchBox: ~60px from top
      const isMobile = window.innerWidth < 768;
      const padding = isMobile
        ? { top: 70, bottom: 320, left: 20, right: 20 }  // Mobile: panel at bottom
        : { top: 70, bottom: 20, left: 440, right: 20 }; // Desktop: panel on left

      // Animate to location when user clicks, centered in visible area
      map.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: Math.max(map.current.getZoom(), 14),
        duration: 500,
        padding,
      });
    }
  }, [selectedLocation]);

  // Update POI markers when selected category changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing POI markers
    poiMarkers.current.forEach((m) => m.remove());
    poiMarkers.current = [];

    if (!selectedCategory) return;

    const color = categoryColors[selectedCategory.id] || "#6b7280";

    // Add POI markers
    selectedCategory.pois.forEach((poi) => {
      const el = document.createElement("div");
      el.className = "poi-marker";
      el.style.cssText = `
        width: 12px;
        height: 12px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const popup = new maplibregl.Popup({
        offset: 10,
        closeButton: false,
        className: "poi-popup",
      }).setHTML(`
        <div style="padding: 4px 8px; font-size: 13px;">
          <strong>${poi.name || "Unnamed"}</strong>
          <br/>
          <span style="color: #666; font-size: 11px;">${poi.distance}m away</span>
        </div>
      `);

      const poiMarker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener("mouseenter", () => poiMarker.togglePopup());
      el.addEventListener("mouseleave", () => poiMarker.togglePopup());

      poiMarkers.current.push(poiMarker);
    });
  }, [selectedCategory]);

  const handleZoomIn = () => {
    map.current?.zoomIn();
  };

  const handleZoomOut = () => {
    map.current?.zoomOut();
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Calculate padding for visible area
        const isMobile = window.innerWidth < 768;
        const padding = isMobile
          ? { top: 70, bottom: 320, left: 20, right: 20 }
          : { top: 70, bottom: 20, left: 440, right: 20 };

        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 1000,
          padding,
        });
        onLocationSelect({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          className="bg-background"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          className="bg-background"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLocate}
          className="bg-background"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
        <Button
          variant={showHeatmap ? "default" : "outline"}
          size="icon"
          onClick={onToggleHeatmap}
          className={showHeatmap ? "" : "bg-background"}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* Heatmap Layer */}
      {mapLoaded && map.current && (
        <HeatmapLayer map={map.current} visible={showHeatmap} />
      )}
    </div>
  );
}

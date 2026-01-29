"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocale } from "next-intl";

// Type declaration for initial location from URL
declare global {
  interface Window {
    __INITIAL_LOCATION__?: { lat: number; lng: number };
  }
}
import { Header } from "@/components/Header";
import { ScorePanel } from "@/components/score/ScorePanel";
import { formatLocationUrl, parseLocationFromPath } from "@/lib/url";
import type { POIResult } from "@/lib/score/types";

const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
});

export interface SelectedLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface SelectedCategory {
  id: string;
  pois: POIResult[];
}

export function MapContainer() {
  const locale = useLocale();
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<SelectedCategory | null>(null);

  // Track previous location to decide push vs replace for history
  const previousLocationRef = useRef<SelectedLocation | null>(null);
  // Track if this is the initial load to avoid double history entry
  const isInitialLoadRef = useRef(true);

  // Read initial location from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.__INITIAL_LOCATION__) {
      const { lat, lng } = window.__INITIAL_LOCATION__;
      setSelectedLocation({ lat, lng });
      // Set initial history state so back works correctly
      window.history.replaceState({ lat, lng }, "", window.location.pathname);
      previousLocationRef.current = { lat, lng };
    }
    // Mark initial load as complete after a tick
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 0);
  }, []);

  // URL sync: Update URL when location changes
  useEffect(() => {
    if (selectedLocation) {
      // Skip URL update during initial load (already have correct URL)
      if (isInitialLoadRef.current) {
        return;
      }

      const url = formatLocationUrl(locale, selectedLocation.lat, selectedLocation.lng);
      const state = { lat: selectedLocation.lat, lng: selectedLocation.lng, address: selectedLocation.address };

      // If this is a NEW location (different from previous), push to history
      // If same location (just updating address), replace
      const isSameLocation = previousLocationRef.current &&
        previousLocationRef.current.lat === selectedLocation.lat &&
        previousLocationRef.current.lng === selectedLocation.lng;

      if (isSameLocation) {
        window.history.replaceState(state, "", url);
      } else {
        window.history.pushState(state, "", url);
      }

      previousLocationRef.current = selectedLocation;
    }
  }, [selectedLocation, locale]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.lat !== undefined && event.state?.lng !== undefined) {
        // Restore location from history state
        setSelectedLocation({
          lat: event.state.lat,
          lng: event.state.lng,
          address: event.state.address,
        });
        setSelectedCategory(null);
      } else {
        // Try to parse from URL path
        const pathParts = window.location.pathname.split("/");
        const locationPart = pathParts[pathParts.length - 1];
        const parsed = parseLocationFromPath(locationPart);
        if (parsed) {
          setSelectedLocation({ lat: parsed.lat, lng: parsed.lng });
          setSelectedCategory(null);
        } else {
          // No location in URL, clear selection
          setSelectedLocation(null);
          setSelectedCategory(null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLocationSelect = useCallback((location: SelectedLocation) => {
    setSelectedLocation(location);
    setSelectedCategory(null); // Clear POIs when selecting new location
  }, []);

  const handleSearchSelect = useCallback(
    (lat: number, lng: number, address: string) => {
      setSelectedLocation({ lat, lng, address });
      setSelectedCategory(null);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setSelectedLocation(null);
    setSelectedCategory(null);
  }, []);

  const handleCategorySelect = useCallback(
    (categoryId: string, pois: POIResult[]) => {
      // Toggle off if same category is clicked
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
      } else {
        setSelectedCategory({ id: categoryId, pois });
      }
    },
    [selectedCategory]
  );

  return (
    <div className="flex flex-col h-full">
      <Header onSearchSelect={handleSearchSelect} />
      <div className="relative flex-1">
        <MapView
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
          selectedCategory={selectedCategory}
        />
        <ScorePanel
          location={selectedLocation}
          onClose={handleClosePanel}
          selectedCategoryId={selectedCategory?.id}
          onCategorySelect={handleCategorySelect}
        />
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SearchBox } from "./SearchBox";
import { ScorePanel } from "@/components/score/ScorePanel";
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
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<SelectedCategory | null>(null);

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
    <>
      <MapView
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
        selectedCategory={selectedCategory}
      />
      <SearchBox onSelect={handleSearchSelect} />
      {selectedLocation && (
        <ScorePanel
          location={selectedLocation}
          onClose={handleClosePanel}
          selectedCategoryId={selectedCategory?.id}
          onCategorySelect={handleCategorySelect}
        />
      )}
    </>
  );
}

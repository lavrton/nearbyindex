"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import { HEATMAP_GRID_STEP } from "@/lib/constants";

interface HeatmapLayerProps {
  map: MaplibreMap;
  visible: boolean;
}

interface HeatCell {
  lat: number;
  lng: number;
  score: number;
}

interface HeatmapData {
  cells: HeatCell[];
  gridStep: number;
}

const HEATMAP_SOURCE_ID = "heatmap-source";
const HEATMAP_LAYER_ID = "heatmap-layer";
const MAX_CACHED_CELLS = 100000; // Allow caching entire city (Cancun ~57k visible cells)

// Create a unique key for a cell based on its coordinates
function cellKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Score to color mapping: transparent → yellow → green
function scoreToColor(score: number): string {
  // Low scores - transparent to warm colors
  if (score < 30) return "rgba(0, 0, 0, 0)";               // Transparent
  if (score < 45) return "rgba(253, 224, 71, 0.15)";       // Yellow 300
  if (score < 60) return "rgba(190, 242, 100, 0.15)";      // Lime 300
  if (score < 70) return "rgba(74, 222, 128, 0.18)";       // Green 400

  // High scores (70-100) - expanded tiers for better differentiation
  if (score < 78) return "rgba(34, 197, 94, 0.18)";        // Green 500 - Good
  if (score < 85) return "rgba(22, 163, 74, 0.20)";        // Green 600 - Very Good
  if (score < 92) return "rgba(21, 128, 61, 0.22)";        // Green 700 - Excellent
  if (score < 97) return "rgba(22, 101, 52, 0.24)";        // Green 800 - Outstanding
  return "rgba(20, 83, 45, 0.26)";                          // Green 900 - Exceptional
}

// Convert cells to GeoJSON polygons (rectangles)
function createGeoJSON(
  cells: HeatCell[],
  gridStep: number
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [cell.lng, cell.lat],
            [cell.lng + gridStep, cell.lat],
            [cell.lng + gridStep, cell.lat + gridStep],
            [cell.lng, cell.lat + gridStep],
            [cell.lng, cell.lat],
          ],
        ],
      },
      properties: {
        score: cell.score,
        color: scoreToColor(cell.score),
      },
    })),
  };
}

export function HeatmapLayer({ map, visible }: HeatmapLayerProps) {
  const [data, setData] = useState<HeatmapData>({ cells: [], gridStep: HEATMAP_GRID_STEP });
  const layerInitialized = useRef(false);
  const cellCache = useRef<Map<string, HeatCell>>(new Map());
  const currentGridStep = useRef<number>(HEATMAP_GRID_STEP);

  // Merge new cells into cache and return merged result
  const mergeCells = useCallback((newCells: HeatCell[], gridStep: number): HeatCell[] => {
    // If grid step changed, clear cache (different city/resolution)
    if (gridStep !== currentGridStep.current) {
      cellCache.current.clear();
      currentGridStep.current = gridStep;
    }

    // Add new cells to cache (overwrites existing with same key)
    for (const cell of newCells) {
      cellCache.current.set(cellKey(cell.lat, cell.lng), cell);
    }

    // If cache is too large, trim oldest entries
    if (cellCache.current.size > MAX_CACHED_CELLS) {
      const entries = Array.from(cellCache.current.entries());
      const toRemove = entries.slice(0, entries.length - MAX_CACHED_CELLS);
      for (const [key] of toRemove) {
        cellCache.current.delete(key);
      }
    }

    return Array.from(cellCache.current.values());
  }, []);

  // Fetch heatmap data with padding for smoother panning
  useEffect(() => {
    if (!visible) return;

    const fetchHeatmapData = async () => {
      try {
        const bounds = map.getBounds();
        // Add 50% padding on each side to preload data outside viewport
        const latPadding = (bounds.getNorth() - bounds.getSouth()) * 0.5;
        const lngPadding = (bounds.getEast() - bounds.getWest()) * 0.5;

        const response = await fetch(
          `/api/heatmap?minLat=${bounds.getSouth() - latPadding}&maxLat=${bounds.getNorth() + latPadding}&minLng=${bounds.getWest() - lngPadding}&maxLng=${bounds.getEast() + lngPadding}`
        );
        if (response.ok) {
          const heatData: HeatmapData = await response.json();
          const mergedCells = mergeCells(heatData.cells, heatData.gridStep);
          setData({ cells: mergedCells, gridStep: heatData.gridStep });
        }
      } catch (error) {
        console.error("Failed to fetch heatmap data:", error);
      }
    };

    fetchHeatmapData();

    // Refetch on map move
    const onMoveEnd = () => fetchHeatmapData();
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [map, visible, mergeCells]);

  // Initialize layer once when visible becomes true
  useEffect(() => {
    if (!visible) {
      // Remove layer when hidden
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.removeLayer(HEATMAP_LAYER_ID);
      }
      if (map.getSource(HEATMAP_SOURCE_ID)) {
        map.removeSource(HEATMAP_SOURCE_ID);
      }
      layerInitialized.current = false;
      return;
    }

    const initLayer = () => {
      if (layerInitialized.current) return;
      if (map.getSource(HEATMAP_SOURCE_ID)) return;

      // Add empty source initially
      map.addSource(HEATMAP_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Grid-based fill layer with reduced opacity
      map.addLayer(
        {
          id: HEATMAP_LAYER_ID,
          type: "fill",
          source: HEATMAP_SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 1, // Opacity is baked into color
          },
        },
        // Insert below labels/symbols for better visibility
        map.getStyle().layers?.find((l) => l.type === "symbol")?.id
      );

      layerInitialized.current = true;
    };

    if (!map.isStyleLoaded()) {
      map.once("style.load", initLayer);
    } else {
      initLayer();
    }

    return () => {
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.removeLayer(HEATMAP_LAYER_ID);
      }
      if (map.getSource(HEATMAP_SOURCE_ID)) {
        map.removeSource(HEATMAP_SOURCE_ID);
      }
      layerInitialized.current = false;
    };
  }, [map, visible]);

  // Update source data when data changes (without recreating layer)
  useEffect(() => {
    if (!visible || data.cells.length === 0) return;

    const source = map.getSource(HEATMAP_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      const geojson = createGeoJSON(data.cells, data.gridStep);
      source.setData(geojson);
    }
  }, [map, visible, data]);

  return null;
}

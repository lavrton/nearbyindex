"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import { HEATMAP_GRID_STEP } from "@/lib/constants";

interface HeatmapLayerProps {
  map: MaplibreMap;
  visible: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
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
const DEBOUNCE_MS = 1000;

// Create a unique key for a cell based on its coordinates
function cellKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Score to color mapping: transparent → yellow → green → teal → purple
function scoreToColor(score: number): string {
  // Low scores - transparent to warm colors
  if (score < 30) return "rgba(0, 0, 0, 0)";               // Transparent
  if (score < 45) return "rgba(253, 224, 71, 0.18)";       // Yellow - Low
  if (score < 60) return "rgba(190, 242, 100, 0.20)";      // Lime - Below average

  // Medium scores - greens
  if (score < 70) return "rgba(74, 222, 128, 0.22)";       // Green 400 - Average
  if (score < 78) return "rgba(34, 197, 94, 0.25)";        // Green 500 - Good

  // High scores - transition to teal/cyan
  if (score < 84) return "rgba(20, 184, 166, 0.28)";       // Teal 500 - Very Good
  if (score < 88) return "rgba(6, 182, 212, 0.32)";        // Cyan 500 - Great

  // Top scores - purple tones
  if (score < 92) return "rgba(139, 92, 246, 0.35)";       // Violet 500 - Excellent
  return "rgba(168, 85, 247, 0.40)";                        // Purple 500 - Exceptional
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

export function HeatmapLayer({ map, visible, onLoadingChange }: HeatmapLayerProps) {
  const [data, setData] = useState<HeatmapData>({ cells: [], gridStep: HEATMAP_GRID_STEP });
  const [isLoading, setIsLoading] = useState(false);
  const layerInitialized = useRef(false);
  const cellCache = useRef<Map<string, HeatCell>>(new Map());
  const currentGridStep = useRef<number>(HEATMAP_GRID_STEP);

  // Optimization refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastBoundsRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

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

  // Report loading state to parent
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Core fetch logic
  const executeFetch = useCallback(async () => {
    // Cancel any previous in-flight request
    abortControllerRef.current?.abort("new request");
    abortControllerRef.current = new AbortController();

    const bounds = map.getBounds();
    // Add 50% padding on each side to preload data outside viewport
    const latPadding = (bounds.getNorth() - bounds.getSouth()) * 0.5;
    const lngPadding = (bounds.getEast() - bounds.getWest()) * 0.5;

    const minLat = bounds.getSouth() - latPadding;
    const maxLat = bounds.getNorth() + latPadding;
    const minLng = bounds.getWest() - lngPadding;
    const maxLng = bounds.getEast() + lngPadding;

    // Skip if bounds haven't changed
    const boundsKey = `${minLat.toFixed(4)},${maxLat.toFixed(4)},${minLng.toFixed(4)},${maxLng.toFixed(4)}`;
    if (boundsKey === lastBoundsRef.current) {
      return;
    }
    lastBoundsRef.current = boundsKey;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/heatmap?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`,
        { signal: abortControllerRef.current.signal }
      );
      if (response.ok) {
        const heatData: HeatmapData = await response.json();
        const mergedCells = mergeCells(heatData.cells, heatData.gridStep);
        setData({ cells: mergedCells, gridStep: heatData.gridStep });
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return; // Silently ignore aborted requests
      }
      console.error("Failed to fetch heatmap data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [map, mergeCells]);

  // Debounced fetch for map movement
  const debouncedFetch = useDebouncedCallback(executeFetch, DEBOUNCE_MS, {
    leading: true,
    trailing: true,
  });

  // Fetch heatmap data with padding for smoother panning
  useEffect(() => {
    if (!visible) return;

    // Reset state when visibility changes
    lastBoundsRef.current = null;
    isInitialLoadRef.current = true;

    // Fetch immediately on mount
    executeFetch();

    // Mark initial load complete after short delay to skip initial moveend
    const initialLoadTimeout = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 100);

    const onMoveEnd = () => {
      // Skip initial moveend event fired during map setup
      if (isInitialLoadRef.current) return;
      debouncedFetch();
    };

    map.on("moveend", onMoveEnd);

    return () => {
      clearTimeout(initialLoadTimeout);
      abortControllerRef.current?.abort();
      debouncedFetch.cancel();
      // Guard against map being destroyed during navigation
      if (map.getStyle()) {
        map.off("moveend", onMoveEnd);
      }
    };
  }, [map, visible, executeFetch, debouncedFetch]);

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
      // Guard against map being destroyed during navigation
      if (!map.getStyle()) return;

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

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MapContainer } from "@/components/map/MapContainer";

interface PointPageProps {
  params: Promise<{ locale: string; coords: string }>;
}

function parseCoords(coords: string): { lat: number; lng: number } | null {
  // Decode URL-encoded characters (e.g., %2C -> ,)
  const decoded = decodeURIComponent(coords);
  // Expected format: "52.52,13.405" (lat,lng)
  const parts = decoded.split(",");
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export async function generateMetadata({
  params,
}: PointPageProps): Promise<Metadata> {
  const { coords } = await params;
  const parsed = parseCoords(coords);

  if (!parsed) {
    return {};
  }

  return {
    title: `Location ${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)} | NearbyIndex`,
    description: `Infrastructure score for location ${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PointPage({ params }: PointPageProps) {
  const { locale, coords } = await params;
  setRequestLocale(locale);

  const parsed = parseCoords(coords);

  if (!parsed) {
    notFound();
  }

  return (
    <main className="h-screen w-screen relative">
      <MapContainer />
      {/* Pre-select this location on load */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__INITIAL_LOCATION__ = { lat: ${parsed.lat}, lng: ${parsed.lng} };`,
        }}
      />
    </main>
  );
}

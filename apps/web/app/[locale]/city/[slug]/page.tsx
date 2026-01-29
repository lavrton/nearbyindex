import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapContainer } from "@/components/map/MapContainer";
import { CityStats } from "@/components/CityStats";
import { getCityStats, CITIES } from "@/lib/city-scores";

// Use cities from city-scores module
const cities = CITIES;

interface CityPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const locales = ["en", "de", "es", "fr"];
  const params: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    for (const slug of Object.keys(cities)) {
      params.push({ locale, slug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const city = cities[slug];
  const stats = getCityStats(slug);

  if (!city) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "city" });

  const title = `${t("exploreTitle", { city: city.name })} | NearbyIndex`;
  // Include score in description for SEO
  const baseDescription = t("description", { city: city.name });
  const description = stats
    ? `${baseDescription}. Overall score: ${stats.overallScore}/100.`
    : baseDescription;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: {
      languages: {
        en: `/en/city/${slug}`,
        de: `/de/city/${slug}`,
        es: `/es/city/${slug}`,
        fr: `/fr/city/${slug}`,
      },
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const city = cities[slug];
  const stats = getCityStats(slug);

  if (!city) {
    notFound();
  }

  return (
    <main className="h-screen w-screen flex flex-col">
      {/* City stats section - only show if stats available */}
      {stats && <CityStats stats={stats} />}

      {/* Map section - takes remaining height */}
      <div className="flex-1 relative min-h-0">
        <MapContainer />
      </div>

      {/* City-specific initial viewport will be set via URL params or context */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__INITIAL_MAP_CENTER__ = { lat: ${city.lat}, lng: ${city.lng}, zoom: 13 };`,
        }}
      />
    </main>
  );
}

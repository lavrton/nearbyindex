import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapContainer } from "@/components/map/MapContainer";

// Sample cities for MVP - in production this would come from database
const cities: Record<string, { name: string; lat: number; lng: number; country: string }> = {
  berlin: { name: "Berlin", lat: 52.52, lng: 13.405, country: "DE" },
  munich: { name: "Munich", lat: 48.1351, lng: 11.582, country: "DE" },
  hamburg: { name: "Hamburg", lat: 53.5511, lng: 9.9937, country: "DE" },
  frankfurt: { name: "Frankfurt", lat: 50.1109, lng: 8.6821, country: "DE" },
  cologne: { name: "Cologne", lat: 50.9375, lng: 6.9603, country: "DE" },
  vienna: { name: "Vienna", lat: 48.2082, lng: 16.3738, country: "AT" },
  zurich: { name: "Zurich", lat: 47.3769, lng: 8.5417, country: "CH" },
  amsterdam: { name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "NL" },
  paris: { name: "Paris", lat: 48.8566, lng: 2.3522, country: "FR" },
  london: { name: "London", lat: 51.5074, lng: -0.1278, country: "GB" },
};

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

  if (!city) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "city" });

  const title = `${t("exploreTitle", { city: city.name })} | NearbyIndex`;
  const description = t("description", { city: city.name });

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

  if (!city) {
    notFound();
  }

  return (
    <main className="h-screen w-screen relative">
      <MapContainer />
      {/* City-specific initial viewport will be set via URL params or context */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__INITIAL_MAP_CENTER__ = { lat: ${city.lat}, lng: ${city.lng}, zoom: 13 };`,
        }}
      />
    </main>
  );
}

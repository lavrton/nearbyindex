import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nearbyindex.com";

// Cities available for SSG
const cities = [
  "berlin",
  "munich",
  "hamburg",
  "frankfurt",
  "cologne",
  "vienna",
  "zurich",
  "amsterdam",
  "paris",
  "london",
];

const locales = ["en", "de", "es", "fr"];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // Home pages for each locale
  for (const locale of locales) {
    routes.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE_URL}/${l}`])
        ),
      },
    });
  }

  // City pages for each locale
  for (const locale of locales) {
    for (const city of cities) {
      routes.push({
        url: `${BASE_URL}/${locale}/city/${city}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/city/${city}`])
          ),
        },
      });
    }
  }

  return routes;
}

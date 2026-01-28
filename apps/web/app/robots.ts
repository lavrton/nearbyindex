import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nearbyindex.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/p/"], // Don't index API routes or point permalinks
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

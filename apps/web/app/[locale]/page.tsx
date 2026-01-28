import { setRequestLocale } from "next-intl/server";
import { MapContainer } from "@/components/map/MapContainer";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="h-screen w-screen relative">
      <MapContainer />
    </main>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NearbyIndex",
  description: "Infrastructure score for any location",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

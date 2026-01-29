"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Utensils,
  Train,
  Heart,
  GraduationCap,
  Trees,
  ShoppingBag,
  Sparkles,
  MapPin,
} from "lucide-react";
import type { ScoreResult } from "@/lib/score/types";
import { categoryColors, scoreToColor } from "@/components/score/CategoryScore";

interface ShareCardProps {
  score: ScoreResult;
  address?: string;
  lat: number;
  lng: number;
  shareUrl: string;
}

const categoryIcons: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  groceries: ShoppingCart,
  restaurants: Utensils,
  transit: Train,
  healthcare: Heart,
  education: GraduationCap,
  parks: Trees,
  shopping: ShoppingBag,
  entertainment: Sparkles,
};

// Category labels for the card (short versions)
const categoryLabels: Record<string, string> = {
  groceries: "Groceries",
  restaurants: "Food",
  transit: "Transit",
  healthcare: "Health",
  education: "Education",
  parks: "Parks",
  shopping: "Shopping",
  entertainment: "Fun",
};

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ score, address, lat, lng, shareUrl }, ref) {
    const t = useTranslations("share");

    // Inline styles required for html-to-image
    const containerStyle: React.CSSProperties = {
      width: 1200,
      height: 630,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      padding: 48,
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#ffffff",
      position: "relative",
      overflow: "hidden",
    };

    const headerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 32,
    };

    const logoStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 24,
      fontWeight: 700,
      color: "#60a5fa",
    };

    const mainScoreContainerStyle: React.CSSProperties = {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: 24,
      padding: "32px 48px",
      textAlign: "center",
      marginBottom: 32,
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    };

    const mainScoreStyle: React.CSSProperties = {
      fontSize: 96,
      fontWeight: 800,
      color: scoreToColor(score.overall),
      lineHeight: 1,
      textShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    };

    const mainScoreLabelStyle: React.CSSProperties = {
      fontSize: 20,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 8,
      fontWeight: 500,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    };

    const categoriesGridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 32,
    };

    const categoryCardStyle: React.CSSProperties = {
      background: "rgba(255, 255, 255, 0.08)",
      borderRadius: 16,
      padding: 16,
      textAlign: "center",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    };

    const categoryScoreStyle = (categoryId: string): React.CSSProperties => ({
      fontSize: 32,
      fontWeight: 700,
      color: categoryColors[categoryId] || "#ffffff",
      marginBottom: 4,
    });

    const categoryLabelStyle: React.CSSProperties = {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.7)",
      fontWeight: 500,
    };

    const footerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: "auto",
    };

    const qrContainerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 24,
    };

    const qrBoxStyle: React.CSSProperties = {
      background: "#ffffff",
      borderRadius: 12,
      padding: 12,
    };

    const locationInfoStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    };

    const addressStyle: React.CSSProperties = {
      fontSize: 18,
      fontWeight: 600,
      color: "#ffffff",
      maxWidth: 400,
    };

    const coordsStyle: React.CSSProperties = {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.6)",
    };

    const brandingStyle: React.CSSProperties = {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "right",
    };

    // Decorative elements
    const decorCircle1: React.CSSProperties = {
      position: "absolute",
      top: -100,
      right: -100,
      width: 300,
      height: 300,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)",
    };

    const decorCircle2: React.CSSProperties = {
      position: "absolute",
      bottom: -50,
      left: -50,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)",
    };

    return (
      <div ref={ref} style={containerStyle}>
        {/* Decorative elements */}
        <div style={decorCircle1} />
        <div style={decorCircle2} />

        {/* Header */}
        <div style={headerStyle}>
          <div style={logoStyle}>
            <MapPin style={{ width: 28, height: 28 }} />
            NearbyIndex
          </div>
        </div>

        {/* Main Score */}
        <div style={mainScoreContainerStyle}>
          <div style={mainScoreStyle}>{score.overall}</div>
          <div style={mainScoreLabelStyle}>Infrastructure Score</div>
        </div>

        {/* Category Grid */}
        <div style={categoriesGridStyle}>
          {score.categories.map((category) => {
            const Icon = categoryIcons[category.id];
            return (
              <div key={category.id} style={categoryCardStyle}>
                <div style={{ marginBottom: 8 }}>
                  {Icon && (
                    <Icon
                      style={{
                        width: 24,
                        height: 24,
                        color: categoryColors[category.id],
                      }}
                    />
                  )}
                </div>
                <div style={categoryScoreStyle(category.id)}>{category.score}</div>
                <div style={categoryLabelStyle}>
                  {categoryLabels[category.id] || category.id}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={qrContainerStyle}>
            <div style={qrBoxStyle}>
              <QRCodeSVG value={shareUrl} size={80} level="M" />
            </div>
            <div style={locationInfoStyle}>
              {address && <div style={addressStyle}>{address}</div>}
              <div style={coordsStyle}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </div>
              <div style={{ ...coordsStyle, marginTop: 4 }}>{t("scanToView")}</div>
            </div>
          </div>
          <div style={brandingStyle}>{t("scoredBy")}</div>
        </div>
      </div>
    );
  }
);

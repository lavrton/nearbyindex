"use client";

import { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
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
  Award,
} from "lucide-react";
import type { ScoreResult } from "@/lib/score/types";
import { categoryColors, scoreToColor } from "@/components/score/CategoryScore";
import type { ParsedLocation } from "../useLocationDisplay";
import { ShareCardBadge } from "@/components/score/BadgeDisplay";
import type { Badge } from "@/lib/badges";

interface ShareCardPrintProps {
  score: ScoreResult;
  location: ParsedLocation;
  shareUrl: string;
  badge?: Badge;
  badgeTitle?: string;
  vibeComment?: string;
}

const categoryIcons: Record<
  string,
  React.ComponentType<{ style?: React.CSSProperties }>
> = {
  groceries: ShoppingCart,
  restaurants: Utensils,
  transit: Train,
  healthcare: Heart,
  education: GraduationCap,
  parks: Trees,
  shopping: ShoppingBag,
  entertainment: Sparkles,
};

const categoryLabels: Record<string, string> = {
  groceries: "Groceries",
  restaurants: "Dining",
  transit: "Transit",
  healthcare: "Healthcare",
  education: "Education",
  parks: "Parks",
  shopping: "Shopping",
  entertainment: "Entertainment",
};

function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 50) return "Average";
  return "Below Average";
}

export const ShareCardPrint = forwardRef<HTMLDivElement, ShareCardPrintProps>(
  function ShareCardPrint({ score, location, shareUrl, badge, badgeTitle, vibeComment }, ref) {
    const containerStyle: React.CSSProperties = {
      width: 1200,
      height: 630,
      background: "#ffffff",
      padding: 48,
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#1a1a1a",
      position: "relative",
      overflow: "hidden",
    };

    const borderStyle: React.CSSProperties = {
      position: "absolute",
      inset: 16,
      border: "2px solid #e5e5e5",
      borderRadius: 8,
      pointerEvents: "none",
    };

    const headerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: "1px solid #e5e5e5",
    };

    const logoStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 20,
      fontWeight: 600,
      color: "#3b82f6",
    };

    const certificateTitleStyle: React.CSSProperties = {
      fontSize: 14,
      color: "#666666",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    };

    const mainContentStyle: React.CSSProperties = {
      display: "flex",
      flex: 1,
      gap: 48,
    };

    const leftColumnStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 320,
    };

    const scoreCircleStyle: React.CSSProperties = {
      width: 200,
      height: 200,
      borderRadius: "50%",
      border: `8px solid ${scoreToColor(score.overall)}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    };

    const mainScoreStyle: React.CSSProperties = {
      fontSize: 72,
      fontWeight: 800,
      color: scoreToColor(score.overall),
      lineHeight: 1,
    };

    const scoreLabelStyle: React.CSSProperties = {
      fontSize: 14,
      color: "#666666",
      marginTop: 4,
      fontWeight: 500,
    };

    const ratingStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 20,
      fontWeight: 600,
      color: "#1a1a1a",
    };

    const locationContainerStyle: React.CSSProperties = {
      marginTop: 24,
      textAlign: "center",
    };

    const primaryLocationStyle: React.CSSProperties = {
      fontSize: 24,
      fontWeight: 700,
      color: "#1a1a1a",
    };

    const secondaryLocationStyle: React.CSSProperties = {
      fontSize: 14,
      color: "#666666",
      marginTop: 4,
    };

    const rightColumnStyle: React.CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
    };

    const categoriesGridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
      flex: 1,
    };

    const categoryRowStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      background: "#f9fafb",
      borderRadius: 8,
    };

    const categoryIconContainerStyle = (
      categoryId: string
    ): React.CSSProperties => ({
      width: 36,
      height: 36,
      borderRadius: 8,
      background: categoryColors[categoryId] || "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    const categoryInfoStyle: React.CSSProperties = {
      flex: 1,
    };

    const categoryLabelTextStyle: React.CSSProperties = {
      fontSize: 13,
      color: "#666666",
    };

    const categoryScoreTextStyle = (
      categoryId: string
    ): React.CSSProperties => ({
      fontSize: 20,
      fontWeight: 700,
      color: categoryColors[categoryId] || "#1a1a1a",
    });

    const footerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "auto",
      paddingTop: 24,
      borderTop: "1px solid #e5e5e5",
    };

    const qrContainerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 16,
    };

    const qrBoxStyle: React.CSSProperties = {
      background: "#ffffff",
      borderRadius: 8,
      padding: 8,
      border: "1px solid #e5e5e5",
    };

    const qrTextStyle: React.CSSProperties = {
      fontSize: 12,
      color: "#666666",
    };

    return (
      <div ref={ref} style={containerStyle}>
        <div style={borderStyle} />

        <div style={headerStyle}>
          <div style={logoStyle}>
            <MapPin style={{ width: 24, height: 24 }} />
            NearbyIndex
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {badge && badgeTitle && (
              <ShareCardBadge badge={badge} title={badgeTitle} />
            )}
            <div style={certificateTitleStyle}>Vibe Score Report</div>
          </div>
        </div>

        <div style={mainContentStyle}>
          <div style={leftColumnStyle}>
            <div style={scoreCircleStyle}>
              <div style={mainScoreStyle}>{score.overall}</div>
              <div style={scoreLabelStyle}>out of 100</div>
            </div>
            <div style={ratingStyle}>
              <Award
                style={{ width: 24, height: 24, color: scoreToColor(score.overall) }}
              />
              {getScoreLabel(score.overall)}
            </div>
            <div style={locationContainerStyle}>
              <div style={primaryLocationStyle}>{location.primary}</div>
              {location.secondary && (
                <div style={secondaryLocationStyle}>{location.secondary}</div>
              )}
              {vibeComment && (
                <div style={{
                  fontSize: 14,
                  color: "#666666",
                  marginTop: 12,
                  fontStyle: "italic",
                }}>
                  "{vibeComment}"
                </div>
              )}
            </div>
          </div>

          <div style={rightColumnStyle}>
            <div style={categoriesGridStyle}>
              {score.categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <div key={category.id} style={categoryRowStyle}>
                    <div style={categoryIconContainerStyle(category.id)}>
                      {Icon && (
                        <Icon style={{ width: 18, height: 18, color: "#ffffff" }} />
                      )}
                    </div>
                    <div style={categoryInfoStyle}>
                      <div style={categoryLabelTextStyle}>
                        {categoryLabels[category.id] || category.id}
                      </div>
                      <div style={categoryScoreTextStyle(category.id)}>
                        {category.score}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <div style={qrContainerStyle}>
            <div style={qrBoxStyle}>
              <QRCodeCanvas value={shareUrl} size={80} level="M" />
            </div>
            <div>
              <div style={{ ...qrTextStyle, fontWeight: 600, color: "#1a1a1a" }}>
                Scan to explore this location
              </div>
              <div style={qrTextStyle}>nearbyindex.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

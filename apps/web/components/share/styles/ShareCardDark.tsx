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
} from "lucide-react";
import type { ScoreResult } from "@/lib/score/types";
import { categoryColors, scoreToColor } from "@/components/score/CategoryScore";
import type { ParsedLocation } from "../useLocationDisplay";
import { ShareCardBadge } from "@/components/score/BadgeDisplay";
import type { Badge } from "@/lib/badges";

interface ShareCardDarkProps {
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
  restaurants: "Food",
  transit: "Transit",
  healthcare: "Health",
  education: "Education",
  parks: "Parks",
  shopping: "Shopping",
  entertainment: "Fun",
};

export const ShareCardDark = forwardRef<HTMLDivElement, ShareCardDarkProps>(
  function ShareCardDark({ score, location, shareUrl, badge, badgeTitle, vibeComment }, ref) {
    const containerStyle: React.CSSProperties = {
      width: 1200,
      height: 630,
      background: "#0a0a0a",
      padding: 48,
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#ffffff",
      position: "relative",
      overflow: "hidden",
    };

    const gridPatternStyle: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
    };

    const headerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 32,
      position: "relative",
      zIndex: 1,
    };

    const logoStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 20,
      fontWeight: 600,
      color: "#6b7280",
    };

    const mainContentStyle: React.CSSProperties = {
      display: "flex",
      flex: 1,
      gap: 48,
      position: "relative",
      zIndex: 1,
    };

    const leftColumnStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 320,
    };

    const locationContainerStyle: React.CSSProperties = {
      marginBottom: 32,
    };

    const primaryLocationStyle: React.CSSProperties = {
      fontSize: 36,
      fontWeight: 800,
      color: "#ffffff",
      marginBottom: 4,
    };

    const secondaryLocationStyle: React.CSSProperties = {
      fontSize: 18,
      color: "#6b7280",
    };

    const scoreContainerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "baseline",
      gap: 12,
    };

    const mainScoreStyle: React.CSSProperties = {
      fontSize: 100,
      fontWeight: 800,
      color: scoreToColor(score.overall),
      lineHeight: 1,
    };

    const scoreUnitStyle: React.CSSProperties = {
      fontSize: 24,
      color: "#6b7280",
      fontWeight: 500,
    };

    const scoreLabelStyle: React.CSSProperties = {
      fontSize: 14,
      color: "#6b7280",
      marginTop: 8,
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    };

    const rightColumnStyle: React.CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    };

    const categoriesGridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12,
    };

    const categoryCardStyle: React.CSSProperties = {
      background: "#141414",
      borderRadius: 12,
      padding: 16,
      textAlign: "center",
      border: "1px solid #1f1f1f",
    };

    const categoryScoreStyle = (categoryId: string): React.CSSProperties => ({
      fontSize: 28,
      fontWeight: 700,
      color: categoryColors[categoryId] || "#ffffff",
      marginBottom: 2,
    });

    const categoryLabelStyle: React.CSSProperties = {
      fontSize: 11,
      color: "#6b7280",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    };

    const footerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "auto",
      paddingTop: 24,
      borderTop: "1px solid #1f1f1f",
      position: "relative",
      zIndex: 1,
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
    };

    const qrTextStyle: React.CSSProperties = {
      fontSize: 12,
      color: "#6b7280",
    };

    // Glow effect
    const glowStyle: React.CSSProperties = {
      position: "absolute",
      top: "50%",
      left: "20%",
      transform: "translate(-50%, -50%)",
      width: 400,
      height: 400,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${scoreToColor(score.overall)}15 0%, transparent 70%)`,
      filter: "blur(60px)",
    };

    return (
      <div ref={ref} style={containerStyle}>
        <div style={gridPatternStyle} />
        <div style={glowStyle} />

        <div style={headerStyle}>
          <div style={logoStyle}>
            <MapPin style={{ width: 20, height: 20 }} />
            NearbyIndex
          </div>
          {badge && badgeTitle && (
            <ShareCardBadge badge={badge} title={badgeTitle} />
          )}
        </div>

        <div style={mainContentStyle}>
          <div style={leftColumnStyle}>
            <div style={locationContainerStyle}>
              <div style={primaryLocationStyle}>{location.primary}</div>
              {location.secondary && (
                <div style={secondaryLocationStyle}>{location.secondary}</div>
              )}
            </div>
            <div style={scoreContainerStyle}>
              <div style={mainScoreStyle}>{score.overall}</div>
              <div style={scoreUnitStyle}>/100</div>
            </div>
            <div style={scoreLabelStyle}>Vibe Score</div>
            {vibeComment && (
              <div style={{
                fontSize: 14,
                color: "#9ca3af",
                marginTop: 16,
                fontStyle: "italic",
                maxWidth: 280,
              }}>
                "{vibeComment}"
              </div>
            )}
          </div>

          <div style={rightColumnStyle}>
            <div style={categoriesGridStyle}>
              {score.categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <div key={category.id} style={categoryCardStyle}>
                    <div style={{ marginBottom: 8 }}>
                      {Icon && (
                        <Icon
                          style={{
                            width: 18,
                            height: 18,
                            color: categoryColors[category.id],
                          }}
                        />
                      )}
                    </div>
                    <div style={categoryScoreStyle(category.id)}>
                      {category.score}
                    </div>
                    <div style={categoryLabelStyle}>
                      {categoryLabels[category.id] || category.id}
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
              <QRCodeCanvas value={shareUrl} size={56} level="M" />
            </div>
            <div>
              <div style={{ ...qrTextStyle, color: "#9ca3af" }}>
                Scan to explore
              </div>
              <div style={qrTextStyle}>nearbyindex.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

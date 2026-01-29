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

interface ShareCardSocialProps {
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

export const ShareCardSocial = forwardRef<HTMLDivElement, ShareCardSocialProps>(
  function ShareCardSocial({ score, location, shareUrl, badge, badgeTitle, vibeComment }, ref) {
    const containerStyle: React.CSSProperties = {
      width: 1200,
      height: 630,
      background:
        "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
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
      justifyContent: "space-between",
      marginBottom: 24,
    };

    const logoStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 24,
      fontWeight: 700,
      color: "#ffffff",
    };

    const mainContentStyle: React.CSSProperties = {
      display: "flex",
      flex: 1,
      gap: 48,
    };

    const scoreContainerStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: 24,
      padding: "32px 48px",
      backdropFilter: "blur(10px)",
      minWidth: 280,
    };

    const mainScoreStyle: React.CSSProperties = {
      fontSize: 120,
      fontWeight: 800,
      color: "#ffffff",
      lineHeight: 1,
      textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    };

    const scoreLabelStyle: React.CSSProperties = {
      fontSize: 18,
      color: "rgba(255, 255, 255, 0.9)",
      marginTop: 8,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    };

    const rightColumnStyle: React.CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    };

    const categoriesGridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12,
    };

    const categoryCardStyle: React.CSSProperties = {
      background: "rgba(255, 255, 255, 0.15)",
      borderRadius: 12,
      padding: 12,
      textAlign: "center",
    };

    const categoryScoreStyle = (categoryId: string): React.CSSProperties => ({
      fontSize: 28,
      fontWeight: 700,
      color: "#ffffff",
      marginBottom: 2,
    });

    const categoryLabelStyle: React.CSSProperties = {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
      fontWeight: 500,
    };

    const locationStyle: React.CSSProperties = {
      marginTop: 24,
    };

    const primaryLocationStyle: React.CSSProperties = {
      fontSize: 28,
      fontWeight: 700,
      color: "#ffffff",
    };

    const secondaryLocationStyle: React.CSSProperties = {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 4,
    };

    const footerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "auto",
      paddingTop: 24,
    };

    const qrContainerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 16,
    };

    const qrBoxStyle: React.CSSProperties = {
      background: "#ffffff",
      borderRadius: 12,
      padding: 8,
    };

    const qrTextStyle: React.CSSProperties = {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
    };

    // Decorative elements
    const decorCircle1: React.CSSProperties = {
      position: "absolute",
      top: -100,
      right: -100,
      width: 400,
      height: 400,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
    };

    const decorCircle2: React.CSSProperties = {
      position: "absolute",
      bottom: -150,
      left: -150,
      width: 500,
      height: 500,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
    };

    return (
      <div ref={ref} style={containerStyle}>
        <div style={decorCircle1} />
        <div style={decorCircle2} />

        <div style={headerStyle}>
          <div style={logoStyle}>
            <MapPin style={{ width: 28, height: 28 }} />
            NearbyIndex
          </div>
          {badge && badgeTitle && (
            <ShareCardBadge badge={badge} title={badgeTitle} />
          )}
        </div>

        <div style={mainContentStyle}>
          <div style={scoreContainerStyle}>
            <div style={mainScoreStyle}>{score.overall}</div>
            <div style={scoreLabelStyle}>Vibe Score</div>
          </div>

          <div style={rightColumnStyle}>
            <div style={categoriesGridStyle}>
              {score.categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <div key={category.id} style={categoryCardStyle}>
                    <div style={{ marginBottom: 4 }}>
                      {Icon && (
                        <Icon
                          style={{
                            width: 20,
                            height: 20,
                            color: "rgba(255, 255, 255, 0.9)",
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

            <div style={locationStyle}>
              <div style={primaryLocationStyle}>{location.primary}</div>
              {location.secondary && (
                <div style={secondaryLocationStyle}>{location.secondary}</div>
              )}
              {vibeComment && (
                <div style={{
                  fontSize: 16,
                  color: "rgba(255, 255, 255, 0.9)",
                  marginTop: 12,
                  fontStyle: "italic",
                }}>
                  "{vibeComment}"
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <div style={qrContainerStyle}>
            <div style={qrBoxStyle}>
              <QRCodeCanvas value={shareUrl} size={64} level="M" />
            </div>
            <div style={qrTextStyle}>Scan to explore</div>
          </div>
          <div style={qrTextStyle}>nearbyindex.com</div>
        </div>
      </div>
    );
  }
);

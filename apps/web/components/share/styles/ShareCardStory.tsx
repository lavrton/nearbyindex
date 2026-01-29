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

interface ShareCardStoryProps {
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

export const ShareCardStory = forwardRef<HTMLDivElement, ShareCardStoryProps>(
  function ShareCardStory({ score, location, shareUrl, badge, badgeTitle, vibeComment }, ref) {
    const containerStyle: React.CSSProperties = {
      width: 1080,
      height: 1920,
      background:
        "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      padding: 64,
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
      justifyContent: "center",
      marginBottom: 48,
    };

    const logoStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 32,
      fontWeight: 700,
      color: "#ffffff",
    };

    const locationContainerStyle: React.CSSProperties = {
      textAlign: "center",
      marginBottom: 64,
    };

    const primaryLocationStyle: React.CSSProperties = {
      fontSize: 56,
      fontWeight: 800,
      color: "#ffffff",
      marginBottom: 8,
    };

    const secondaryLocationStyle: React.CSSProperties = {
      fontSize: 28,
      color: "rgba(255, 255, 255, 0.7)",
    };

    const scoreContainerStyle: React.CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    };

    const scoreCircleStyle: React.CSSProperties = {
      width: 400,
      height: 400,
      borderRadius: "50%",
      background: `conic-gradient(${scoreToColor(score.overall)} ${score.overall * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
    };

    const scoreInnerCircleStyle: React.CSSProperties = {
      width: 340,
      height: 340,
      borderRadius: "50%",
      background: "rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(20px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    };

    const mainScoreStyle: React.CSSProperties = {
      fontSize: 140,
      fontWeight: 800,
      color: "#ffffff",
      lineHeight: 1,
    };

    const scoreLabelStyle: React.CSSProperties = {
      fontSize: 24,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 8,
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    };

    const categoriesContainerStyle: React.CSSProperties = {
      marginBottom: 64,
    };

    const categoriesGridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 24,
    };

    const categoryCardStyle: React.CSSProperties = {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: 20,
      padding: 20,
      textAlign: "center",
    };

    const categoryScoreStyle: React.CSSProperties = {
      fontSize: 40,
      fontWeight: 700,
      color: "#ffffff",
      marginBottom: 4,
    };

    const categoryLabelStyle: React.CSSProperties = {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.7)",
      fontWeight: 500,
    };

    const footerStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
    };

    const qrContainerStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
    };

    const qrBoxStyle: React.CSSProperties = {
      background: "#ffffff",
      borderRadius: 20,
      padding: 16,
    };

    const qrTextStyle: React.CSSProperties = {
      fontSize: 20,
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
    };

    // Decorative elements
    const decorCircle1: React.CSSProperties = {
      position: "absolute",
      top: 200,
      right: -200,
      width: 500,
      height: 500,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)",
    };

    const decorCircle2: React.CSSProperties = {
      position: "absolute",
      bottom: 400,
      left: -200,
      width: 500,
      height: 500,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
    };

    return (
      <div ref={ref} style={containerStyle}>
        <div style={decorCircle1} />
        <div style={decorCircle2} />

        <div style={headerStyle}>
          <div style={logoStyle}>
            <MapPin style={{ width: 36, height: 36 }} />
            NearbyIndex
          </div>
        </div>

        {badge && badgeTitle && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <ShareCardBadge
              badge={badge}
              title={badgeTitle}
              style={{ fontSize: 18, paddingLeft: 16, paddingRight: 20, paddingTop: 10, paddingBottom: 10 }}
            />
          </div>
        )}

        <div style={locationContainerStyle}>
          <div style={primaryLocationStyle}>{location.primary}</div>
          {location.secondary && (
            <div style={secondaryLocationStyle}>{location.secondary}</div>
          )}
        </div>

        <div style={scoreContainerStyle}>
          <div style={scoreCircleStyle}>
            <div style={scoreInnerCircleStyle}>
              <div style={mainScoreStyle}>{score.overall}</div>
              <div style={scoreLabelStyle}>Score</div>
            </div>
          </div>
          {vibeComment && (
            <div style={{
              fontSize: 22,
              color: "rgba(255, 255, 255, 0.9)",
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: 600,
              marginTop: 8,
            }}>
              "{vibeComment}"
            </div>
          )}
        </div>

        <div style={categoriesContainerStyle}>
          <div style={categoriesGridStyle}>
            {score.categories.slice(0, 4).map((category) => {
              const Icon = categoryIcons[category.id];
              return (
                <div key={category.id} style={categoryCardStyle}>
                  <div style={{ marginBottom: 8 }}>
                    {Icon && (
                      <Icon
                        style={{
                          width: 28,
                          height: 28,
                          color: categoryColors[category.id],
                        }}
                      />
                    )}
                  </div>
                  <div style={categoryScoreStyle}>{category.score}</div>
                  <div style={categoryLabelStyle}>
                    {categoryLabels[category.id] || category.id}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={categoriesGridStyle}>
            {score.categories.slice(4, 8).map((category) => {
              const Icon = categoryIcons[category.id];
              return (
                <div key={category.id} style={categoryCardStyle}>
                  <div style={{ marginBottom: 8 }}>
                    {Icon && (
                      <Icon
                        style={{
                          width: 28,
                          height: 28,
                          color: categoryColors[category.id],
                        }}
                      />
                    )}
                  </div>
                  <div style={categoryScoreStyle}>{category.score}</div>
                  <div style={categoryLabelStyle}>
                    {categoryLabels[category.id] || category.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={footerStyle}>
          <div style={qrContainerStyle}>
            <div style={qrBoxStyle}>
              <QRCodeCanvas value={shareUrl} size={100} level="M" />
            </div>
            <div style={qrTextStyle}>Scan to explore this location</div>
          </div>
        </div>
      </div>
    );
  }
);

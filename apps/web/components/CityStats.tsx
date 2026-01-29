"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart,
  Utensils,
  Train,
  Heart,
  GraduationCap,
  Trees,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { scoreToColor, categoryColors } from "@/components/score/CategoryScore";
import type { CityStats as CityStatsType } from "@/lib/city-scores";

interface CityStatsProps {
  stats: CityStatsType;
}

const categoryIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
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

export function CityStats({ stats }: CityStatsProps) {
  const t = useTranslations();

  return (
    <div className="bg-background border-b">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* City name and overall score */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t("city.exploreTitle", { city: stats.name })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("city.description", { city: stats.name })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("city.overallScore")}
              </p>
              <p
                className="text-3xl font-bold"
                style={{ color: scoreToColor(stats.overallScore) }}
              >
                {stats.overallScore}
              </p>
            </div>
            <div className="h-12 w-12">
              <svg viewBox="0 0 36 36" className="transform -rotate-90">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={scoreToColor(stats.overallScore)}
                  strokeWidth="3"
                  strokeDasharray={`${stats.overallScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Category cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.categories.map((category) => {
            const Icon = categoryIcons[category.id] || ShoppingCart;
            const iconColor = categoryColors[category.id] || "#6b7280";
            const barColor = scoreToColor(category.score);
            const categoryName = t(
              `score.categories.${category.id}` as Parameters<typeof t>[0]
            );

            return (
              <Card key={category.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${iconColor}15` }}
                    >
                      <span style={{ color: iconColor }}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {categoryName}
                      </p>
                    </div>
                    <span className="text-lg font-bold">{category.score}</span>
                  </div>
                  <Progress
                    value={category.score}
                    className="h-1.5"
                    style={
                      { "--progress-color": barColor } as React.CSSProperties
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Explore hint */}
        <p className="text-sm text-muted-foreground text-center mt-4">
          {t("city.exploreMap")}
        </p>
      </div>
    </div>
  );
}

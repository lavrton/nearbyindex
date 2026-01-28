"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";
import type { CategoryScoreResult } from "@/lib/score/types";

interface CategoryScoreProps {
  category: CategoryScoreResult;
  isSelected?: boolean;
  onSelect?: () => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  groceries: ShoppingCart,
  restaurants: Utensils,
  transit: Train,
  healthcare: Heart,
  education: GraduationCap,
  parks: Trees,
  shopping: ShoppingBag,
  entertainment: Sparkles,
};

export const categoryColors: Record<string, string> = {
  groceries: "#22c55e",
  restaurants: "#f97316",
  transit: "#3b82f6",
  healthcare: "#ef4444",
  education: "#8b5cf6",
  parks: "#10b981",
  shopping: "#ec4899",
  entertainment: "#f59e0b",
};

// Score-based color for progress bars (same logic as heatmap)
export function scoreToColor(score: number): string {
  if (score < 30) return "#ef4444";  // Red - Poor
  if (score < 50) return "#f97316";  // Orange - Below average
  if (score < 70) return "#eab308";  // Yellow - Average
  if (score < 85) return "#84cc16";  // Lime - Good
  return "#22c55e";                   // Green - Excellent
}

export function CategoryScore({ category, isSelected, onSelect }: CategoryScoreProps) {
  const t = useTranslations("score");
  const Icon = categoryIcons[category.id] || ShoppingCart;
  const color = categoryColors[category.id] || "#6b7280";
  const barColor = scoreToColor(category.score);

  const categoryName = t(`categories.${category.id}` as Parameters<typeof t>[0]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              "w-full space-y-0.5 p-1 -mx-1 rounded-lg transition-colors text-left",
              "hover:bg-muted/50",
              isSelected && "bg-muted ring-1 ring-primary/20"
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span style={{ color: isSelected ? color : undefined }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className={cn(isSelected && "font-medium")}>{categoryName}</span>
                {isSelected && (
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className="font-medium">{category.score}</span>
            </div>
            <Progress
              value={category.score}
              className="h-1"
              style={{ "--progress-color": barColor } as React.CSSProperties}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium">Click to show on map</p>
            <p>
              {t("details.count", {
                count: category.count,
                radius: category.radius,
              })}
            </p>
            {category.nearestDistance && (
              <p>
                {t("details.nearestDistance", {
                  distance: Math.round(category.nearestDistance),
                })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

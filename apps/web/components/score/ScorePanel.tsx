"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryScore, scoreToColor } from "./CategoryScore";
import { ScoreSkeleton } from "./ScoreSkeleton";
import type { SelectedLocation } from "@/components/map/MapContainer";
import type { ScoreResult, POIResult } from "@/lib/score/types";

interface ScorePanelProps {
  location: SelectedLocation;
  onClose: () => void;
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string, pois: POIResult[]) => void;
}

export function ScorePanel({
  location,
  onClose,
  selectedCategoryId,
  onCategorySelect,
}: ScorePanelProps) {
  const t = useTranslations("score");
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/score?lat=${location.lat}&lng=${location.lng}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch score");
        }

        const data = await response.json();
        setScore(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchScore();
  }, [location.lat, location.lng]);

  return (
    <Card className="absolute top-16 left-4 z-10 w-72 shadow-xl">
      <CardHeader className="py-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{t("title")}</CardTitle>
            {location.address && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {location.address}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2 px-3">
        {isLoading ? (
          <ScoreSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : score ? (
          <div className="space-y-2">
            {/* Overall Score */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{t("overall")}</span>
                <span className="text-sm font-bold">{score.overall}</span>
              </div>
              <Progress
                value={score.overall}
                className="h-2"
                style={{ "--progress-color": scoreToColor(score.overall) } as React.CSSProperties}
              />
            </div>

            {/* Category Scores */}
            <div className="space-y-1 pt-1 border-t">
              {score.categories.map((category) => (
                <CategoryScore
                  key={category.id}
                  category={category}
                  isSelected={selectedCategoryId === category.id}
                  onSelect={() => onCategorySelect(category.id, category.pois)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}

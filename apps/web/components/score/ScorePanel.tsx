"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryScore, scoreToColor } from "./CategoryScore";
import { ScoreSkeleton } from "./ScoreSkeleton";
import { BadgeDisplay } from "./BadgeDisplay";
import { ShareButton } from "@/components/share/ShareButton";
import { ShareModal } from "@/components/share/ShareModal";
import { evaluateBadge } from "@/lib/badges";
import type { SelectedLocation } from "@/components/map/MapContainer";
import type { ScoreResult, POIResult } from "@/lib/score/types";

interface ScorePanelProps {
  location: SelectedLocation | null;
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
  const tVibe = useTranslations("vibe");
  const tEmpty = useTranslations("emptyState");
  const locale = useLocale();
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [vibeComment, setVibeComment] = useState<string | null>(null);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  // Evaluate badge when score changes
  const badge = useMemo(() => {
    if (!score) return null;
    return evaluateBadge(score);
  }, [score]);

  // AbortController refs to cancel in-flight requests
  const scoreAbortControllerRef = useRef<AbortController | null>(null);
  const vibeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any previous in-flight request
    scoreAbortControllerRef.current?.abort();

    if (!location) {
      setScore(null);
      setIsLoading(false);
      setVibeComment(null);
      return;
    }

    scoreAbortControllerRef.current = new AbortController();

    const fetchScore = async () => {
      setIsLoading(true);
      setError(null);
      setVibeComment(null);

      try {
        const response = await fetch(
          `/api/score?lat=${location.lat}&lng=${location.lng}`,
          { signal: scoreAbortControllerRef.current!.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch score");
        }

        const data = await response.json();
        setScore(data);
        setIsLoading(false);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return; // Silently ignore aborted requests - don't touch loading state
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    };

    fetchScore();

    return () => {
      scoreAbortControllerRef.current?.abort();
    };
    // Only refetch when coordinates change, not when address is added
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  // Fetch vibe comment when score is available
  useEffect(() => {
    // Cancel any previous in-flight vibe request
    vibeAbortControllerRef.current?.abort();

    if (!score) {
      setVibeLoading(false);
      return;
    }

    // Set loading immediately so UI shows loading state
    setVibeLoading(true);
    vibeAbortControllerRef.current = new AbortController();

    const fetchVibe = async () => {
      try {
        const response = await fetch("/api/vibe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overall: score.overall,
            categories: score.categories.map((c) => ({
              id: c.id,
              score: c.score,
            })),
            locale,
          }),
          signal: vibeAbortControllerRef.current!.signal,
        });

        const data = await response.json();
        // Handle both success and fallback responses
        setVibeComment(data.comment || data.fallback || null);
        setVibeLoading(false);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return; // Silently ignore aborted requests - don't touch loading state
        }
        console.error("Vibe fetch error:", err);
        setVibeLoading(false);
        // Silent fail - vibe is optional
      }
    };

    // Add a small delay to not compete with score rendering
    const timeout = setTimeout(fetchVibe, 100);
    return () => {
      clearTimeout(timeout);
      vibeAbortControllerRef.current?.abort();
    };
  }, [score, locale]);

  // Empty state when no location selected
  if (!location) {
    return (
      <Card className="absolute top-4 left-4 z-10 w-72 shadow-xl">
        <CardContent className="py-6 px-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{tEmpty("title")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tEmpty("subtitle")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {tEmpty("searchHint")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="absolute top-4 left-4 z-10 w-72 shadow-xl">
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

              {/* Badge */}
              {badge && (
                <div className="pt-1">
                  <BadgeDisplay badge={badge} size="sm" />
                </div>
              )}

              {/* Vibe Comment */}
              <div className="py-1">
                {vibeLoading ? (
                  <Skeleton className="h-4 w-full" />
                ) : vibeComment ? (
                  <p className="text-xs italic text-muted-foreground">
                    "{vibeComment}"
                  </p>
                ) : null}
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

              {/* Share CTA */}
              <div className="pt-3 mt-2 border-t">
                <ShareButton
                  onClick={() => setShareModalOpen(true)}
                  score={score.overall}
                />
              </div>

              {/* Disclaimer */}
              <div className="pt-2 mt-1">
                <button
                  onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
                  className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
                >
                  {t("disclaimer.trigger")}
                </button>
                {disclaimerExpanded && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {t("disclaimer.message")}{" "}
                    <a
                      href="https://x.com/lavrton"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-muted-foreground"
                    >
                      @lavrton
                    </a>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Share Modal */}
      {score && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          score={score}
          lat={location.lat}
          lng={location.lng}
          address={location.address}
        />
      )}
    </>
  );
}

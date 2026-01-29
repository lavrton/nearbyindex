"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link2, Download, Share, Check, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShareCardSocial,
  ShareCardPrint,
  ShareCardStory,
  ShareCardDark,
} from "./styles";
import { useShareImage } from "./useShareImage";
import { getShareableUrl } from "@/lib/url";
import { SHARE_STYLES, DEFAULT_STYLE, type ShareStyleId } from "./styleConfigs";
import { parseLocationDisplay } from "./useLocationDisplay";
import { evaluateBadge } from "@/lib/badges";
import type { ScoreResult } from "@/lib/score/types";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: ScoreResult;
  lat: number;
  lng: number;
  address?: string;
}

export function ShareModal({
  open,
  onOpenChange,
  score,
  lat,
  lng,
  address,
}: ShareModalProps) {
  const t = useTranslations("share");
  const tBadges = useTranslations("badges");
  const locale = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ShareStyleId>(DEFAULT_STYLE);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [vibeComment, setVibeComment] = useState<string | null>(null);

  const shareUrl = getShareableUrl(locale, lat, lng);
  const location = parseLocationDisplay(address, lat, lng);
  const styleConfig = SHARE_STYLES[selectedStyle];

  // Evaluate badge
  const badge = useMemo(() => evaluateBadge(score), [score]);
  const badgeTitle = badge ? tBadges(badge.id.replace(/-/g, "_") as "perfect_spot") : null;

  // Fetch vibe comment when modal opens
  useEffect(() => {
    if (!open) return;

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
        });

        const data = await response.json();
        setVibeComment(data.comment || data.fallback || null);
      } catch (err) {
        console.error("Vibe fetch error:", err);
      }
    };

    fetchVibe();
  }, [open, score, locale]);

  const { isGenerating, downloadImage, generatePNG } = useShareImage({
    cardRef,
  });

  // Generate preview when modal opens or style changes
  useEffect(() => {
    if (!open) {
      setPreviewDataUrl(null);
      return;
    }

    const generatePreview = async () => {
      // Wait for next tick to ensure card is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!cardRef.current) return;

      setIsGeneratingPreview(true);
      try {
        // Wait for fonts to be ready
        await document.fonts.ready;
        const dataUrl = await toPng(cardRef.current, {
          quality: 0.8,
          pixelRatio: 1,
        });
        setPreviewDataUrl(dataUrl);
      } catch (err) {
        console.error("Failed to generate preview:", err);
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    generatePreview();
  }, [open, selectedStyle, score, address, vibeComment, badge]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleDownload = useCallback(async () => {
    const filename = address
      ? `nearbyindex-${selectedStyle}-${address.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30)}.png`
      : `nearbyindex-${selectedStyle}-${lat.toFixed(4)}-${lng.toFixed(4)}.png`;
    await downloadImage(filename);
  }, [address, lat, lng, downloadImage, selectedStyle]);

  const handleNativeShare = useCallback(async () => {
    // Check if native share is supported
    if (!navigator.share) return;

    try {
      // Try to share with image first
      const dataUrl = await generatePNG();
      if (dataUrl) {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "nearbyindex-score.png", {
          type: "image/png",
        });

        // Check if we can share files
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "NearbyIndex Score",
            text: address
              ? `Infrastructure score for ${address}`
              : `Infrastructure score: ${score.overall}`,
            url: shareUrl,
            files: [file],
          });
          return;
        }
      }

      // Fallback to URL-only share
      await navigator.share({
        title: "NearbyIndex Score",
        text: address
          ? `Infrastructure score for ${address}`
          : `Infrastructure score: ${score.overall}`,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed - ignore
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  }, [generatePNG, shareUrl, address, score.overall]);

  const supportsNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  // Render the appropriate card based on selected style
  const renderShareCard = () => {
    const props = {
      score,
      location,
      shareUrl,
      badge: badge || undefined,
      badgeTitle: badgeTitle || undefined,
      vibeComment: vibeComment || undefined,
    };
    switch (selectedStyle) {
      case "social":
        return <ShareCardSocial ref={cardRef} {...props} />;
      case "print":
        return <ShareCardPrint ref={cardRef} {...props} />;
      case "story":
        return <ShareCardStory ref={cardRef} {...props} />;
      case "dark":
        return <ShareCardDark ref={cardRef} {...props} />;
      default:
        return <ShareCardSocial ref={cardRef} {...props} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("downloadHint")}</DialogDescription>
        </DialogHeader>

        {/* Style Selector */}
        <div className="flex gap-2">
          {Object.values(SHARE_STYLES).map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg border-2 transition-colors text-sm font-medium",
                selectedStyle === style.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted hover:bg-muted/80"
              )}
            >
              {t(`styles.${style.id}`)}
            </button>
          ))}
        </div>

        {/* Preview - shows generated image */}
        <div
          className="relative rounded-lg border overflow-hidden bg-muted flex items-center justify-center"
          style={{
            height: selectedStyle === "story" ? "300px" : "auto",
            aspectRatio: selectedStyle === "story" ? undefined : styleConfig.aspectRatio,
          }}
        >
          {previewDataUrl ? (
            <img
              src={previewDataUrl}
              alt="Preview"
              className={cn(
                "object-contain",
                selectedStyle === "story" ? "h-full w-auto" : "w-full h-full"
              )}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Hidden full-size card for generation */}
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          {renderShareCard()}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("copied")}
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                {t("copyLink")}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownload}
            disabled={isGenerating || isGeneratingPreview}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("download")}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("download")}
              </>
            )}
          </Button>

          {supportsNativeShare && (
            <Button className="flex-1" onClick={handleNativeShare}>
              <Share className="mr-2 h-4 w-4" />
              {t("nativeShare")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

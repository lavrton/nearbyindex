"use client";

import { useCallback, useState, RefObject } from "react";
import { toPng } from "html-to-image";

interface UseShareImageOptions {
  cardRef: RefObject<HTMLDivElement | null>;
}

interface UseShareImageReturn {
  isGenerating: boolean;
  error: string | null;
  generatePNG: () => Promise<string | null>;
  downloadImage: (filename?: string) => Promise<void>;
}

export function useShareImage({
  cardRef,
}: UseShareImageOptions): UseShareImageReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePNG = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current) {
      setError("Share card not ready");
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2, // Higher quality for retina displays
        cacheBust: true,
      });
      return dataUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate image";
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [cardRef]);

  const downloadImage = useCallback(
    async (filename = "nearbyindex-score.png"): Promise<void> => {
      const dataUrl = await generatePNG();
      if (!dataUrl) return;

      // Create download link
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    },
    [generatePNG]
  );

  return {
    isGenerating,
    error,
    generatePNG,
    downloadImage,
  };
}

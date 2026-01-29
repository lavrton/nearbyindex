"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  onClick: () => void;
  score?: number;
}

export function ShareButton({ onClick, score }: ShareButtonProps) {
  const t = useTranslations("share");

  return (
    <Button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
    >
      <Share2 className="mr-2 h-4 w-4" />
      {t("shareScore")}
    </Button>
  );
}

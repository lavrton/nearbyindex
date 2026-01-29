"use client";

import { useTranslations } from "next-intl";
import {
  Crown,
  Zap,
  Flame,
  Mountain,
  Pizza,
  Car,
  Moon,
  Home,
  Briefcase,
  Leaf,
} from "lucide-react";
import type { Badge } from "@/lib/badges";

interface BadgeDisplayProps {
  badge: Badge;
  size?: "sm" | "md" | "lg";
}

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  crown: Crown,
  zap: Zap,
  flame: Flame,
  mountain: Mountain,
  pizza: Pizza,
  car: Car,
  moon: Moon,
  home: Home,
  briefcase: Briefcase,
  leaf: Leaf,
};

const sizeClasses = {
  sm: {
    container: "px-2 py-0.5 text-xs gap-1",
    icon: "h-3 w-3",
  },
  md: {
    container: "px-2.5 py-1 text-sm gap-1.5",
    icon: "h-4 w-4",
  },
  lg: {
    container: "px-3 py-1.5 text-base gap-2",
    icon: "h-5 w-5",
  },
};

export function BadgeDisplay({ badge, size = "md" }: BadgeDisplayProps) {
  const tBadges = useTranslations("badges");
  const Icon = iconMap[badge.icon];
  const classes = sizeClasses[size];

  // Get title from i18n using badge id with underscores
  const badgeKey = badge.id.replace(/-/g, "_") as "perfect_spot";
  const title = tBadges(badgeKey);

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${classes.container}`}
      style={{
        backgroundColor: badge.bgColor,
        color: badge.color,
      }}
    >
      {Icon && <Icon className={classes.icon} />}
      <span>{title}</span>
    </div>
  );
}

/**
 * Badge display for share cards (no i18n, direct title)
 */
interface ShareCardBadgeProps {
  badge: Badge;
  title: string;
  style?: React.CSSProperties;
}

export function ShareCardBadge({ badge, title, style }: ShareCardBadgeProps) {
  const Icon = iconMap[badge.icon];

  const containerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 9999,
    backgroundColor: badge.bgColor,
    color: badge.color,
    fontWeight: 600,
    fontSize: 14,
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    width: 16,
    height: 16,
  };

  return (
    <div style={containerStyle}>
      {Icon && <Icon style={iconStyle} />}
      <span>{title}</span>
    </div>
  );
}

import type { ScoreResult } from "@/lib/score/types";

export interface Badge {
  id: string;
  titleKey: string; // i18n key for title
  descriptionKey: string; // i18n key for description
  icon: string; // emoji or icon name
  color: string; // hex color for badge styling
  bgColor: string; // background color
}

export interface BadgeDefinition extends Badge {
  condition: (score: ScoreResult) => boolean;
  priority: number; // lower = higher priority
}

/**
 * Helper to get category score from ScoreResult
 */
function getCategoryScore(score: ScoreResult, categoryId: string): number {
  const category = score.categories.find((c) => c.id === categoryId);
  return category?.score ?? 0;
}

/**
 * Badge definitions with conditions and priorities.
 * A location may match multiple badges - only the highest priority (lowest number) is shown.
 */
export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "perfect-spot",
    titleKey: "badges.perfect-spot",
    descriptionKey: "badge-descriptions.perfect-spot",
    icon: "crown",
    color: "#fbbf24", // gold
    bgColor: "#fef3c7",
    priority: 1,
    condition: (score) => score.overall >= 95,
  },
  {
    id: "15min-hero",
    titleKey: "badges.15min-hero",
    descriptionKey: "badge-descriptions.15min-hero",
    icon: "zap",
    color: "#22c55e", // green
    bgColor: "#dcfce7",
    priority: 2,
    condition: (score) =>
      getCategoryScore(score, "groceries") >= 80 &&
      getCategoryScore(score, "transit") >= 80 &&
      getCategoryScore(score, "healthcare") >= 70,
  },
  {
    id: "certified-chaos",
    titleKey: "badges.certified-chaos",
    descriptionKey: "badge-descriptions.certified-chaos",
    icon: "flame",
    color: "#ef4444", // red
    bgColor: "#fee2e2",
    priority: 3,
    condition: (score) => score.overall <= 25,
  },
  {
    id: "off-grid",
    titleKey: "badges.off-grid",
    descriptionKey: "badge-descriptions.off-grid",
    icon: "mountain",
    color: "#78716c", // stone
    bgColor: "#f5f5f4",
    priority: 4,
    condition: (score) =>
      score.overall <= 15 && getCategoryScore(score, "parks") >= 50,
  },
  {
    id: "food-desert",
    titleKey: "badges.food-desert",
    descriptionKey: "badge-descriptions.food-desert",
    icon: "pizza",
    color: "#f97316", // orange
    bgColor: "#ffedd5",
    priority: 5,
    condition: (score) => getCategoryScore(score, "groceries") <= 20,
  },
  {
    id: "car-required",
    titleKey: "badges.car-required",
    descriptionKey: "badge-descriptions.car-required",
    icon: "car",
    color: "#6366f1", // indigo
    bgColor: "#e0e7ff",
    priority: 6,
    condition: (score) => getCategoryScore(score, "transit") <= 15,
  },
  {
    id: "night-owl",
    titleKey: "badges.night-owl",
    descriptionKey: "badge-descriptions.night-owl",
    icon: "moon",
    color: "#8b5cf6", // purple
    bgColor: "#ede9fe",
    priority: 7,
    condition: (score) =>
      getCategoryScore(score, "entertainment") >= 70 &&
      getCategoryScore(score, "groceries") <= 40,
  },
  {
    id: "suburban-dream",
    titleKey: "badges.suburban-dream",
    descriptionKey: "badge-descriptions.suburban-dream",
    icon: "home",
    color: "#06b6d4", // cyan
    bgColor: "#cffafe",
    priority: 8,
    condition: (score) =>
      getCategoryScore(score, "education") >= 70 &&
      getCategoryScore(score, "parks") >= 70 &&
      getCategoryScore(score, "entertainment") <= 30,
  },
  {
    id: "workaholic-zone",
    titleKey: "badges.workaholic-zone",
    descriptionKey: "badge-descriptions.workaholic-zone",
    icon: "briefcase",
    color: "#64748b", // slate
    bgColor: "#f1f5f9",
    priority: 9,
    condition: (score) =>
      getCategoryScore(score, "entertainment") <= 20 &&
      getCategoryScore(score, "transit") >= 60,
  },
  {
    id: "wellness-retreat",
    titleKey: "badges.wellness-retreat",
    descriptionKey: "badge-descriptions.wellness-retreat",
    icon: "leaf",
    color: "#10b981", // emerald
    bgColor: "#d1fae5",
    priority: 10,
    condition: (score) =>
      getCategoryScore(score, "parks") >= 70 &&
      getCategoryScore(score, "healthcare") >= 70,
  },
];

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  const definition = badgeDefinitions.find((b) => b.id === id);
  if (!definition) return undefined;

  const { condition, priority, ...badge } = definition;
  return badge;
}

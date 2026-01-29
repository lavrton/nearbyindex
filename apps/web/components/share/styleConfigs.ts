export type ShareStyleId = "social" | "print" | "story" | "dark";

export interface ShareStyleConfig {
  id: ShareStyleId;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const SHARE_STYLES: Record<ShareStyleId, ShareStyleConfig> = {
  social: {
    id: "social",
    name: "Social",
    width: 1200,
    height: 630,
    aspectRatio: "1200/630",
  },
  print: {
    id: "print",
    name: "Print",
    width: 1200,
    height: 630,
    aspectRatio: "1200/630",
  },
  story: {
    id: "story",
    name: "Story",
    width: 1080,
    height: 1920,
    aspectRatio: "9/16",
  },
  dark: {
    id: "dark",
    name: "Dark",
    width: 1200,
    height: 630,
    aspectRatio: "1200/630",
  },
};

export const DEFAULT_STYLE: ShareStyleId = "social";

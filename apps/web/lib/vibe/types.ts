export interface VibeRequest {
  overall: number;
  categories: { id: string; score: number }[];
  locale?: string;
}

export interface VibeResponse {
  comment: string;
  cached: boolean;
  generatedAt: string;
}

export interface VibeError {
  error: string;
  fallback: string;
}

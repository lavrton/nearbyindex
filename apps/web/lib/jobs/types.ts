export const JOB_TYPES = {
  HEATMAP_COMPUTE: "heatmap_compute",
} as const;

export const JOB_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export interface HeatmapJobMetadata {
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  gridStep: number;
  lastProcessedIndex?: number;
}

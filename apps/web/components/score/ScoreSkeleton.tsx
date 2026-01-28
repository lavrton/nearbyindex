import { Skeleton } from "@/components/ui/skeleton";

export function ScoreSkeleton() {
  return (
    <div className="space-y-2">
      {/* Overall Score Skeleton */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>

      {/* Category Skeletons */}
      <div className="space-y-1 pt-1 border-t">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-0.5 p-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-3 w-5" />
            </div>
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

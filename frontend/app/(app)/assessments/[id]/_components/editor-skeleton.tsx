import { Skeleton } from "@/components/ui/skeleton";

/** The editor's shape while the test loads. */
export function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the test" className="flex flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-80 max-w-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

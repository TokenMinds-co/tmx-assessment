import { Skeleton } from "@/components/ui/skeleton";

export default function InvitationLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the results" className="flex flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

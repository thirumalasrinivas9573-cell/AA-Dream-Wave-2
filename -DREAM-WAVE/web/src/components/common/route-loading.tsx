import { Skeleton } from "@/components/common/skeleton";

/**
 * Shared route-level skeleton used by loading.tsx and dynamic() fallbacks.
 */
export function RouteLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="container-app fade-in flex flex-1 flex-col gap-6 py-8 md:py-10"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl sm:col-span-2 xl:col-span-1" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

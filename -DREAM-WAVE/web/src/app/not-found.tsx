import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";

/**
 * Premium 404 page.
 */
export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container-app flex flex-1 flex-col items-center justify-center gap-5 py-20 text-center outline-none"
    >
      <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Page not found
      </h1>
      <p className="text-muted-foreground max-w-md text-sm text-pretty sm:text-base">
        The page you requested does not exist or has been moved. Use search from
        the platform header, or return home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href={ROUTES.home} className={cn(buttonVariants(), "h-10")}>
          Back to home
        </Link>
        <Link
          href={ROUTES.dashboard}
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Open dashboard
        </Link>
      </div>
    </main>
  );
}

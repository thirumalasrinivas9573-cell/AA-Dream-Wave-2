"use client";

import { useEffect } from "react";

import { ErrorUI } from "@/components/common/error-ui";
import { RetryAction } from "@/components/common/retry-action";
import { toUserSafeMessage } from "@/lib/errors";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error UI foundation (App Router `error.tsx`).
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col outline-none"
    >
      <ErrorUI
        description={toUserSafeMessage(error)}
        action={<RetryAction onRetry={reset} />}
      />
    </main>
  );
}

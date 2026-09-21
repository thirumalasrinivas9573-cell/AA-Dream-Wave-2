"use client";

import { ErrorUI } from "@/components/common/error-ui";
import { RetryAction } from "@/components/common/retry-action";
import { toUserSafeMessage } from "@/lib/errors";

export default function CampusError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorUI
      title="Campus experience could not be loaded"
      description={toUserSafeMessage(error)}
      action={<RetryAction onRetry={reset} />}
      className="min-h-[50vh]"
    />
  );
}

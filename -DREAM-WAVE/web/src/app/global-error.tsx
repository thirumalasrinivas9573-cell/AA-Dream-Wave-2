"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root unexpected-error UI (App Router `global-error.tsx`).
 * Must render its own `<html>` and `<body>`.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
        <h1 className="text-xl font-semibold tracking-tight">
          Application error
        </h1>
        <p className="text-muted-foreground max-w-md text-center text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Reload
        </button>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Z_INDEX } from "@/constants";

/**
 * Offline state banner for global UX.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 flex justify-center p-3"
      style={{ zIndex: Z_INDEX.toast }}
    >
      <Alert
        variant="warning"
        title="You are offline"
        description="Some actions need a connection. We'll reconnect automatically."
        className="pointer-events-auto max-w-lg shadow-lg"
        role="alert"
        aria-live="assertive"
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Alert>
    </div>
  );
}

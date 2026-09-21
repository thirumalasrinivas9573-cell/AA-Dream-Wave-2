"use client";

import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Z_INDEX } from "@/constants";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => undefined,
    };
  }
  return ctx;
}

/** Keeps app tree stable when toast list updates. */
const StableTree = memo(function StableTree({
  children,
}: {
  children: ReactNode;
}) {
  return children;
});

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 mx-auto flex w-auto max-w-[22rem] flex-col gap-2 sm:inset-x-auto sm:right-4 sm:left-auto sm:mx-0 sm:w-[min(100%-2rem,22rem)]"
      style={{ zIndex: Z_INDEX.toast }}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "border-border bg-card text-card-foreground toast-enter pointer-events-auto relative overflow-hidden rounded-xl border px-3.5 py-3 text-sm shadow-lg",
            item.variant === "success" &&
              "border-emerald-500/30 bg-emerald-500/10",
            item.variant === "error" &&
              "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          role={item.variant === "error" ? "alert" : "status"}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.description ? (
                <p className="text-muted-foreground mt-1 text-xs text-pretty">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="shrink-0"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(item.id)}
            >
              ×
            </Button>
          </div>
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-0.5 opacity-40",
              item.variant === "error"
                ? "bg-destructive"
                : item.variant === "success"
                  ? "bg-emerald-500"
                  : "bg-foreground",
            )}
            aria-hidden="true"
          >
            <div className="toast-progress bg-current h-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const toast = useCallback(
    (input: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = {
        id,
        title: input.title,
        variant: input.variant ?? "default",
        ...(input.description ? { description: input.description } : {}),
      };
      setItems((prev) => [item, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((entry) => entry.id !== id));
      }, 4200);
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <StableTree>{children}</StableTree>
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

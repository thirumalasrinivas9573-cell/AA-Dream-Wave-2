"use client";

import { GripVertical, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACCENT_OPTIONS } from "@/constants/personalization";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { usePersonalizationStore } from "@/store/personalization-store";
import type { AccentColor, DashboardWidgetId } from "@/types/personalization";

export function DashboardCustomizer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const widgets = usePersonalizationStore((s) => s.widgets);
  const widgetOrder = usePersonalizationStore((s) => s.widgetOrder);
  const accent = usePersonalizationStore((s) => s.accent);
  const denserLayout = usePersonalizationStore((s) => s.denserLayout);
  const favoriteSections = usePersonalizationStore((s) => s.favoriteSections);
  const setAccent = usePersonalizationStore((s) => s.setAccent);
  const setDenserLayout = usePersonalizationStore((s) => s.setDenserLayout);
  const toggleWidgetVisibility = usePersonalizationStore(
    (s) => s.toggleWidgetVisibility,
  );
  const moveWidget = usePersonalizationStore((s) => s.moveWidget);
  const reorderWidget = usePersonalizationStore((s) => s.reorderWidget);
  const toggleFavoriteSection = usePersonalizationStore(
    (s) => s.toggleFavoriteSection,
  );
  const resetLayout = usePersonalizationStore((s) => s.resetLayout);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [draggingId, setDraggingId] = useState<DashboardWidgetId | null>(null);

  if (!open) return null;

  const ordered = widgetOrder
    .map((id) => widgets.find((widget) => widget.id === id))
    .filter(Boolean) as typeof widgets;

  return (
    <Card
      id="dashboard-layout-manager"
      className="border-primary/30"
      role="region"
      aria-label="Dashboard layout manager"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Widget layout manager</CardTitle>
            <CardDescription>
              Drag to reorder, toggle visibility, theme, accent, and favorites.
              Layout is saved on this device.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => resetLayout()}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Theme</p>
            <div className="flex flex-wrap gap-2">
              {(["light", "dark", "system"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={
                    (theme ?? resolvedTheme) === mode ? "default" : "outline"
                  }
                  aria-pressed={(theme ?? resolvedTheme) === mode}
                  onClick={() => setTheme(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "size-8 rounded-full border-2 transition-[transform,border-color] duration-150 pressable",
                    accent === option.id
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ background: option.css }}
                  aria-label={option.label}
                  aria-pressed={accent === option.id}
                  onClick={() => setAccent(option.id as AccentColor)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Density</p>
            <Button
              type="button"
              size="sm"
              variant={denserLayout ? "default" : "outline"}
              aria-pressed={denserLayout}
              onClick={() => setDenserLayout(!denserLayout)}
            >
              {denserLayout ? "Comfortable" : "Compact"} layout
            </Button>
          </div>
        </div>

        <ul className="mt-4 space-y-2" aria-label="Dashboard widgets">
          {ordered.map((widget) => (
            <li
              key={widget.id}
              draggable
              onDragStart={() => setDraggingId(widget.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) reorderWidget(draggingId, widget.id);
                setDraggingId(null);
              }}
              className={cn(
                "border-border bg-background flex cursor-grab flex-wrap items-center gap-2 rounded-xl border px-3 py-2 transition-[opacity,box-shadow,border-color,transform] duration-150 active:cursor-grabbing",
                draggingId === widget.id &&
                  "border-primary/40 opacity-60 shadow-md scale-[0.99]",
                draggingId &&
                  draggingId !== widget.id &&
                  "border-dashed border-primary/25",
              )}
            >
              <GripVertical
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{widget.label}</p>
                <p className="text-muted-foreground text-xs">
                  {widget.description}
                </p>
              </div>
              <Button
                type="button"
                size="xs"
                variant={
                  favoriteSections.includes(widget.id) ? "default" : "outline"
                }
                aria-pressed={favoriteSections.includes(widget.id)}
                onClick={() => toggleFavoriteSection(widget.id)}
              >
                Favorite
              </Button>
              <Button
                type="button"
                size="xs"
                variant={widget.visible ? "default" : "outline"}
                aria-pressed={widget.visible}
                onClick={() => toggleWidgetVisibility(widget.id)}
              >
                {widget.visible ? "Visible" : "Hidden"}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-label={`Move ${widget.label} up`}
                onClick={() => moveWidget(widget.id, "up")}
              >
                Up
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-label={`Move ${widget.label} down`}
                onClick={() => moveWidget(widget.id, "down")}
              >
                Down
              </Button>
            </li>
          ))}
        </ul>
      </CardHeader>
    </Card>
  );
}

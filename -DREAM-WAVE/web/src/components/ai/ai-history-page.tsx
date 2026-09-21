"use client";

import { Heart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AiPageHeader } from "@/components/ai/ai-shared";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_TOOLS } from "@/constants/ai-platform";
import { cn } from "@/lib/utils";
import { useAiPlatformStore } from "@/store/ai-platform-store";

export function AiHistoryPage({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const hydrate = useAiPlatformStore((s) => s.hydrate);
  const hydrated = useAiPlatformStore((s) => s.hydrated);
  const promptHistory = useAiPlatformStore((s) => s.promptHistory);
  const toggleFavoritePrompt = useAiPlatformStore((s) => s.toggleFavoritePrompt);
  const removePrompt = useAiPlatformStore((s) => s.removePrompt);
  const clearPromptHistory = useAiPlatformStore((s) => s.clearPromptHistory);

  const [query, setQuery] = useState("");
  const [toolFilter, setToolFilter] = useState("all");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promptHistory.filter((item) => {
      if (favoritesOnly && !item.favorite) return false;
      if (toolFilter !== "all" && item.tool !== toolFilter) return false;
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        item.tool.toLowerCase().includes(q)
      );
    });
  }, [favoritesOnly, promptHistory, query, toolFilter]);

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <AiPageHeader
        title={favoritesOnly ? "Favorite prompts" : "Prompt history"}
        description={
          favoritesOnly
            ? "Prompts you starred across AI tools."
            : "Search and filter recent prompts across the AI Platform."
        }
        actions={
          !favoritesOnly ? (
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => clearPromptHistory()}
            >
              Clear all
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts…"
          className="h-10"
          aria-label="Search prompts"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={toolFilter === "all" ? "default" : "outline"}
            onClick={() => setToolFilter("all")}
          >
            All
          </Button>
          {AI_TOOLS.map((tool) => (
            <Button
              key={tool.id}
              type="button"
              size="sm"
              variant={toolFilter === tool.id ? "default" : "outline"}
              onClick={() => setToolFilter(tool.id)}
            >
              {tool.title.replace("AI ", "")}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={favoritesOnly ? "No favorites yet" : "No prompts yet"}
          description={
            favoritesOnly
              ? "Star prompts from any AI chat to see them here."
              : "Use Mentor, Teacher, Career, or other AI tools to build history."
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-border flex items-start gap-3 rounded-2xl border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-pretty">{item.text}</p>
                <p className="text-muted-foreground mt-1 text-xs capitalize">
                  {item.tool} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={item.favorite ? "Unfavorite" : "Favorite"}
                aria-pressed={Boolean(item.favorite)}
                onClick={() => toggleFavoritePrompt(item.id)}
              >
                <Heart
                  className={cn(
                    "size-4",
                    item.favorite && "fill-current text-rose-500",
                  )}
                />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Delete prompt"
                onClick={() => removePrompt(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

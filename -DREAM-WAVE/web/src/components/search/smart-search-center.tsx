"use client";

import Link from "next/link";
import { BookOpen, Building2, FileText, Search, Sparkles, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { SearchFeedbackBar } from "@/components/search/search-feedback-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchApi, type SearchResult } from "@/lib/api/search";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "document", label: "Documents" },
  { id: "research", label: "Research" },
  { id: "opportunity", label: "Opportunities" },
  { id: "company", label: "Companies" },
  { id: "institution", label: "Institutions" },
] as const;

const TYPE_ICON: Record<string, typeof FileText> = {
  DOCUMENT: FileText,
  OPPORTUNITY: Target,
  COMPANY: Building2,
  INSTITUTION: Building2,
  RESEARCH: BookOpen,
  BOOK: BookOpen,
}

export function SmartSearchCenter() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [intent, setIntent] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zeroResults, setZeroResults] = useState(false);

  const loadSuggestions = useCallback(async (prefix = "") => {
    if (!token) return;
    try {
      const res = await searchApi.suggest(token, prefix);
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  }, [token])

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const runSearch = async (q = query) => {
    if (!token || !q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchApi.search(token, {
        q: q.trim(),
        ...(type !== "all" ? { type } : {}),
      })
      setResults(res.results);
      setIntent(res.intent);
      setZeroResults(Boolean(res.zeroResults));
      setRecent(res.recent || []);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave AI</p>
        <h1 className="text-2xl font-semibold tracking-tight">Smart Search</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Hybrid keyword + semantic discovery across authorized documents, research, opportunities, and ecosystem records — evidence-first, with citations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Ask anything
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. machine learning projects for healthcare"
              className="max-w-lg"
              onKeyDown={(e) => e.key === "Enter" && void runSearch()}
              aria-label="Search query"
            />
            <Button onClick={() => void runSearch()} disabled={loading || !query.trim()}>
              Search
            </Button>
            <Link href="/search/research" className={cn(buttonVariants({ variant: "outline" }))}>
              Research Mode
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={type === f.id ? "default" : "outline"}
                onClick={() => setType(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {suggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button key={s} size="sm" variant="ghost" onClick={() => { setQuery(s); void runSearch(s); }}>
                  {s}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {intent ? (
        <p className="text-muted-foreground text-xs">Intent: {intent.replace(/_/g, " ")}</p>
      ) : null}

      {recent.length ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {recent.slice(0, 6).map((r) => (
              <Button key={r} size="sm" variant="outline" onClick={() => { setQuery(r); void runSearch(r); }}>{r}</Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loading ? <RouteLoading label="Searching authorized sources" /> : null}

      {!loading && zeroResults ? (
        <EmptyState title="No matching results" description="Try broadening your search or removing filters." />
      ) : null}

      {!loading && results.length ? (
        <div className="space-y-3">
          {results.map((r) => {
            const Icon = TYPE_ICON[r.type] || FileText;
            return (
              <Card key={`${r.type}-${r.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Icon className="text-muted-foreground mt-0.5 h-4 w-4" />
                      <div>
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <CardDescription>{r.description || r.excerpt}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">{r.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {r.personalized && r.explanation ? (
                    <p className="text-primary text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {r.explanation}
                    </p>
                  ) : null}
                  {r.section || r.page ? (
                    <p className="text-muted-foreground text-xs">Source: {r.section}{r.page ? ` · p.${r.page}` : ""}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {r.href ? (
                      <Link href={r.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                        Open
                      </Link>
                    ) : null}
                  </div>
                  <SearchFeedbackBar resultId={r.id} query={query} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

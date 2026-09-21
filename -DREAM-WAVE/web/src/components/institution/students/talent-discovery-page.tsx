"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import {
  institutionStudentsApi,
  type SavedFilter,
} from "@/lib/api/institution-students";

const PRESET_FILTERS = [
  { label: "Python Developers", query: "python developers available for placement" },
  { label: "React Developers", query: "react developers with shared projects" },
  { label: "AI/ML Students", query: "final year AI ML students" },
  { label: "Final Year Pool", query: "final year placement ready" },
  { label: "Cloud Ready", query: "cloud certification students" },
];

export function TalentDiscoveryPage() {
  const { token } = useAuth();
  const [query] = useState("");
  const [smartQuery, setSmartQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<
    Array<{ id: string; fullName: string; department: string; batch: string; matchReasons?: string[] }>
  >([]);
  const [parseReasons, setParseReasons] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [skillFilter, setSkillFilter] = useState("");
  const [placementFilter, setPlacementFilter] = useState("");

  const loadSaved = useCallback(async () => {
    if (!token) return;
    try {
      const res = await institutionStudentsApi.listSavedFilters(token);
      setSavedFilters(res.filters);
    } catch {
      /* optional */
    }
  }, [token]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function runDiscover(filters: Record<string, string> = {}) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionStudentsApi.discoverTalent(token, {
        q: query || undefined,
        skill: skillFilter || undefined,
        placementLifecycle: placementFilter || undefined,
        ...filters,
        page: 1,
        limit: 20,
      });
      setStudents(res.students);
      setParseReasons([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  async function runSmartSearch(text: string) {
    if (!token || !text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionStudentsApi.smartSearch(token, text);
      setStudents(res.students);
      setParseReasons(res.parseReasons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smart search failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        eyebrow="Talent Intelligence"
        title="Talent Discovery"
        description="Discover placement-ready students using structured filters and natural language search. Match explanations are rule-based — never AI scores."
        actions={
          <Link href={INSTITUTION_ROUTES.students} className={buttonVariants({ variant: "outline" })}>
            Student directory
          </Link>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" aria-hidden="true" />
            Smart search
          </CardTitle>
          <CardDescription>
            Example: &quot;Show final year AI students with React projects&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xl flex-1"
              value={smartQuery}
              onChange={(e) => setSmartQuery(e.target.value)}
              placeholder="Natural language talent search…"
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSmartSearch(smartQuery);
              }}
            />
            <Button onClick={() => void runSmartSearch(smartQuery)}>Search</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_FILTERS.map((p) => (
              <Button key={p.label} size="sm" variant="outline" onClick={() => {
                setSmartQuery(p.query);
                void runSmartSearch(p.query);
              }}>
                {p.label}
              </Button>
            ))}
          </div>
          {parseReasons.length ? (
            <div className="text-muted-foreground text-sm">
              <p className="font-medium text-foreground">Filters applied:</p>
              <ul className="mt-1 list-disc pl-5">
                {parseReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Skill</label>
              <Input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="React, Python…" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Placement lifecycle</label>
              <select className="form-control w-full" value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value)}>
                <option value="">Any</option>
                <option value="READY,ELIGIBLE,APPLYING">Available for placement</option>
                <option value="PLACED">Placed</option>
                <option value="PREPARING">Preparing</option>
              </select>
            </div>
            <Button className="w-full" onClick={() => void runDiscover()}>
              <Search className="size-4" aria-hidden="true" />
              Apply filters
            </Button>
            {savedFilters.length ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Saved filters</p>
                {savedFilters.map((f) => (
                  <Button
                    key={f._id}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => void runDiscover(f.filterConfig as Record<string, string>)}
                  >
                    {f.name}
                  </Button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {loading ? <RouteLoading label="Discovering talent" /> : null}
          {!loading && students.length === 0 ? (
            <EmptyState
              title="No matching students"
              description="Try smart search or adjust filters. Results always come from actual institution records."
            />
          ) : null}
          {!loading && students.length > 0 ? (
            <ul className="space-y-3">
              {students.map((s) => (
                <li key={s.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={INSTITUTION_ROUTES.studentDetail(s.id)} className="text-primary font-medium hover:underline">
                        {s.fullName}
                      </Link>
                      <p className="text-muted-foreground text-sm">{s.department} · {s.batch || "—"}</p>
                    </div>
                    <Link href={INSTITUTION_ROUTES.studentDetail(s.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      View profile
                    </Link>
                  </div>
                  {s.matchReasons?.length ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Matched because</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.matchReasons.map((r) => (
                          <Badge key={r} variant="secondary">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

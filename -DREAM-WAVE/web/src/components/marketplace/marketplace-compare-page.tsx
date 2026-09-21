"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { marketplaceApi } from "@/lib/api/marketplace";

type ComparisonRow = {
  source: string;
  id: string;
  title?: string;
  organizer?: string;
  kind?: string;
  deadline?: string;
  location?: string;
  mode?: string;
  requiredSkills?: string[];
  alignment?: { score?: number; category?: string };
  eligibility?: Record<string, unknown>;
};

export function MarketplaceComparePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonRow[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>("");

  const load = useCallback(async () => {
    if (!token) return;
    const raw = searchParams.get("items");
    if (!raw) {
      setLoading(false);
      return;
    }
    let items: Array<{ source: string; id: string }>;
    try {
      items = JSON.parse(decodeURIComponent(raw)) as Array<{ source: string; id: string }>;
    } catch {
      setError("Invalid comparison selection");
      setLoading(false);
      return;
    }
    if (items.length < 2) {
      setError("Select at least two opportunities to compare");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.compare(token, items);
      setComparisons((res.comparison.comparisons || []) as ComparisonRow[]);
      setDisclaimer(res.comparison.disclaimer || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Comparing opportunities" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compare Opportunities</h1>
          <p className="text-muted-foreground text-sm">Side-by-side alignment — no invented salary or benefits.</p>
        </div>
        <Link href={ROUTES.marketplace} className={buttonVariants({ variant: "outline" })}>
          Back to marketplace
        </Link>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {comparisons.length >= 2 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((row) => (
            <Card key={`${row.source}-${row.id}`}>
              <CardHeader>
                <CardTitle className="text-base">{row.title || "Untitled"}</CardTitle>
                <p className="text-muted-foreground text-sm">{row.organizer}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Type:</span> {row.kind || row.source}
                </p>
                {row.deadline ? (
                  <p>
                    <span className="font-medium">Deadline:</span> {new Date(row.deadline).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Deadline: unknown</p>
                )}
                {row.location ? (
                  <p>
                    <span className="font-medium">Location:</span> {row.location}
                  </p>
                ) : null}
                {row.mode ? (
                  <p>
                    <span className="font-medium">Mode:</span> {row.mode}
                  </p>
                ) : null}
                {row.requiredSkills?.length ? (
                  <div>
                    <p className="font-medium">Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.requiredSkills.slice(0, 6).map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {row.alignment?.score !== undefined ? (
                  <p>
                    <span className="font-medium">Profile alignment:</span> {row.alignment.score}%
                  </p>
                ) : null}
                <Link href={`/opportunities/${row.source}/${row.id}`} className={buttonVariants({ size: "sm" })}>
                  View details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing to compare"
          description="Select two or more opportunities from the marketplace browse page."
        />
      )}

      {disclaimer ? <p className="text-muted-foreground text-xs">{disclaimer}</p> : null}
      <Button variant="outline" onClick={() => void load()}>
        Refresh comparison
      </Button>
    </div>
  );
}

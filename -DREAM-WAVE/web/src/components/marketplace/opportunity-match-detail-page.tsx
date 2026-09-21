"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { marketplaceApi, type ApplicationReadiness, type MatchDetail } from "@/lib/api/marketplace";

export function OpportunityMatchDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const source = String(params?.source || "");
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [readiness, setReadiness] = useState<ApplicationReadiness | null>(null);

  const load = useCallback(async () => {
    if (!token || !source || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [matchRes, readyRes] = await Promise.all([
        marketplaceApi.getMatchDetail(token, source, id),
        marketplaceApi.getReadiness(token, source, id),
      ]);
      setDetail(matchRes.detail);
      setReadiness(readyRes.readiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match detail");
    } finally {
      setLoading(false);
    }
  }, [token, source, id]);

  useEffect(() => { void load(); }, [load]);

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading match analysis" />;
  if (error || !detail) return <Alert variant="error">{error || "Match not found"}</Alert>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <Link href="/opportunities" className="text-muted-foreground text-sm hover:underline">← Opportunities</Link>
        <h1 className="mt-2 text-2xl font-semibold">{detail.opportunity.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{detail.match.category.replace(/_/g, " ")}</Badge>
          <Badge variant="outline">{detail.opportunity.status}</Badge>
        </div>
      </div>

      {readiness ? (
        <Card className="from-primary/5 border-primary/20 bg-gradient-to-br">
          <CardHeader>
            <CardTitle className="text-base">Application readiness: {readiness.state.replace(/_/g, " ")}</CardTitle>
            <CardDescription>{readiness.explanation.what}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">{readiness.explanation.why}</p>
            {readiness.disclaimer ? <p className="text-muted-foreground mt-2 text-xs">{readiness.disclaimer}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Matched</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.skillEvidence.matched.length ? detail.skillEvidence.matched.map((m) => (
              <div key={m.skill}>
                <p className="font-medium">✓ {m.skill} <Badge variant="outline" className="ml-1">{m.evidenceLevel}</Badge></p>
                {m.evidence.map((e, i) => (
                  <p key={i} className="text-muted-foreground pl-4 text-xs">{e.type}{e.title ? `: ${e.title}` : ""}</p>
                ))}
              </div>
            )) : <p className="text-muted-foreground">No skill matches with evidence</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Gaps & unknown</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.skillEvidence.missing.map((m) => (
              <p key={m.skill}>⚠ {m.skill}</p>
            ))}
            {detail.requirements.unknownRequirements.map((u) => (
              <p key={u.label} className="text-muted-foreground">? {u.label} — insufficient data</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {detail.alignment.explainableScore ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile alignment</CardTitle>
            <CardDescription>{detail.alignment.disclaimer}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(detail.alignment.explainableScore, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>Back to feed</Link>
        <Button disabled={!readiness?.safeToApply}>Apply (confirmation required)</Button>
      </div>
    </div>
  );
}

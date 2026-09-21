"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchApi, type ResearchSession } from "@/lib/api/search";

const LABEL_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  SOURCE_FACT: "default",
  SYNTHESIS: "secondary",
  INFERENCE: "outline",
  RECOMMENDATION: "outline",
};

export function ResearchModeCenter() {
  const { token } = useAuth();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ResearchSession | null>(null);

  const run = async () => {
    if (!token || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchApi.research(token, question.trim());
      setSession(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/search" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Smart Search
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Research Mode</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Retrieve → rank → cite → synthesize. Answers are grounded in authorized sources only.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Research question</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What skills are important for AI engineering careers?"
            className="max-w-xl"
            onKeyDown={(e) => e.key === "Enter" && void run()}
          />
          <Button onClick={() => void run()} disabled={loading || !question.trim()}>Research</Button>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {loading ? <RouteLoading label="Retrieving and synthesizing sources" /> : null}

      {session ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Answer</CardTitle>
                <CardDescription>{session.status}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">{session.answer}</CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Research plan</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-4 text-sm">
                  {session.plan.map((p) => (
                    <li key={p.order}>{p.step} ({p.agentId})</li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Key findings</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {session.keyFindings.map((f, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <Badge variant={LABEL_VARIANT[f.label] || "outline"} className="mb-1">{f.label.replace(/_/g, " ")}</Badge>
                    <p>{f.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {session.limitations?.length ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Limitations</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {session.limitations.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sources
              </CardTitle>
              <CardDescription>{session.sources.length} authorized source(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.sources.length ? session.sources.map((s, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground text-xs">{s.sourceType}{s.section ? ` · ${s.section}` : ""}{s.page ? ` · p.${s.page}` : ""}</p>
                  <p className="mt-1 line-clamp-3">{s.excerpt}</p>
                  {s.href ? (
                    <Link href={s.href} className="text-primary mt-2 inline-block text-xs underline">View source</Link>
                  ) : null}
                </div>
              )) : (
                <p className="text-muted-foreground text-sm">Insufficient information in available sources.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

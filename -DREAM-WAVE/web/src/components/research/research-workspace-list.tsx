"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { researchWorkspaceApi, type ResearchWorkspace } from "@/lib/api/research-workspace";

export function ResearchWorkspaceListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ResearchWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await researchWorkspaceApi.list(token);
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load workspaces");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const create = async () => {
    if (!token || !question.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await researchWorkspaceApi.create(token, {
        title: title.trim() || question.trim().slice(0, 80),
        researchQuestion: question.trim(),
      });
      window.location.href = `/research/workspace/${res.workspace._id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setCreating(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading research workspaces" />;

  return (
    <div className="container-app space-y-8 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/research" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Research home
        </Link>
        <Link href="/search/research" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Search className="mr-1 h-4 w-4" />
          Research Mode
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Research Workspaces</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Evidence-first research: collect sources, extract claims, synthesize, and build traceable reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New workspace</CardTitle>
          <CardDescription>Start with a clear research question.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rw-title">Title (optional)</Label>
            <Input id="rw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AI engineering skills study" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="rw-question">Research question</Label>
            <Input
              id="rw-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What skills are most relevant for AI engineering opportunities?"
              onKeyDown={(e) => e.key === "Enter" && void create()}
            />
          </div>
          <Button type="button" onClick={() => void create()} disabled={creating || !question.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Create workspace
          </Button>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((ws) => (
          <Link key={ws._id} href={`/research/workspace/${ws._id}`}>
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{ws.title}</CardTitle>
                  <Badge variant="outline">{ws.status}</Badge>
                </div>
                <CardDescription className="line-clamp-2">{ws.researchQuestion}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground flex gap-4 text-xs">
                <span>{ws.sources?.length ?? 0} sources</span>
                <span>{ws.reports?.length ?? 0} reports</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!items.length ? (
          <p className="text-muted-foreground col-span-full text-sm">No workspaces yet. Create one above.</p>
        ) : null}
      </div>
    </div>
  );
}

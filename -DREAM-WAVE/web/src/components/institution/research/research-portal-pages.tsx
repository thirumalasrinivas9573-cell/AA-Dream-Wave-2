"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { OpportunityTypeBadge, formatResearchDate } from "@/components/institution/research/research-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { institutionResearchApi } from "@/lib/api/institution-research";
import type { ResearchOpportunity } from "@/types/research-management";

export function ResearchOpportunitiesBrowsePage() {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResearchOpportunity | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionResearchApi.browseOpportunities(token);
      setOpportunities(res.opportunities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApply() {
    if (!token || !selected) return;
    setError(null);
    setApplySuccess(null);
    try {
      await institutionResearchApi.applyToOpportunity(token, selected._id, { coverLetter });
      setApplySuccess(`Application submitted for "${selected.title}".`);
      setSelected(null);
      setCoverLetter("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed");
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading research opportunities" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <div>
        <p className="text-muted-foreground text-sm">Research & Innovation</p>
        <h1 className="text-2xl font-semibold">Research Opportunities</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse and apply for research assistant positions, innovation challenges, thesis opportunities, and collaborative programs at your institution.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {applySuccess ? <Alert>{applySuccess}</Alert> : null}

      {!opportunities.length ? (
        <EmptyState
          title="No published opportunities"
          description="Your institution has not published any open research opportunities yet, or your account is not linked to an institution student profile."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp) => (
            <Card key={opp._id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{opp.title}</CardTitle>
                  <OpportunityTypeBadge type={opp.opportunityType} />
                </div>
                <CardDescription>{opp.department || opp.researchArea || "—"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{opp.description || "No description provided."}</p>
                <p className="text-muted-foreground text-xs">
                  Deadline: {formatResearchDate(opp.applicationDeadline)}
                </p>
                <Button size="sm" onClick={() => setSelected(opp)}>Apply</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apply: {selected.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="form-control min-h-24 w-full"
              placeholder="Cover letter or motivation statement"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => void handleApply()}>Submit Application</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function InnovationIdeaSubmitPage() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: "",
    ideaType: "startup_idea",
    problemStatement: "",
    proposedSolution: "",
    description: "",
    tags: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await institutionResearchApi.submitIdeaAsUser(token, {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setSuccess("Your innovation idea has been submitted for review.");
      setForm({ title: "", ideaType: "startup_idea", problemStatement: "", proposedSolution: "", description: "", tags: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) return <RouteLoading label="Authenticating" />;

  return (
    <div className="container-app flex max-w-2xl flex-1 flex-col gap-6 py-6 sm:py-8">
      <div>
        <p className="text-muted-foreground text-sm">Innovation Portal</p>
        <h1 className="text-2xl font-semibold">Submit an Innovation Idea</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Share startup ideas, research concepts, product innovations, social impact proposals, or technology proposals with your institution.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Title</span>
          <input className="form-control" required value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Idea Type</span>
          <select className="form-control" value={form.ideaType} onChange={(e) => setForm((s) => ({ ...s, ideaType: e.target.value }))}>
            <option value="startup_idea">Startup Idea</option>
            <option value="research_concept">Research Concept</option>
            <option value="product_innovation">Product Innovation</option>
            <option value="social_impact">Social Impact</option>
            <option value="technology_proposal">Technology Proposal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Problem Statement</span>
          <textarea className="form-control min-h-24" required value={form.problemStatement} onChange={(e) => setForm((s) => ({ ...s, problemStatement: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Proposed Solution</span>
          <textarea className="form-control min-h-24" value={form.proposedSolution} onChange={(e) => setForm((s) => ({ ...s, proposedSolution: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Additional Description</span>
          <textarea className="form-control min-h-20" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tags (comma-separated)</span>
          <input className="form-control" value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} />
        </label>
        <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Idea"}</Button>
      </form>
    </div>
  );
}

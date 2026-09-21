"use client";

import { Shield, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { RecommendationFeedbackBar } from "@/components/personalization/recommendation-feedback-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  personalizationApi,
  type PrivacyCenterData,
} from "@/lib/api/personalization";

export function PersonalizationCenter() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyCenterData | null>(null);
  const [rememberText, setRememberText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await personalizationApi.getPrivacyCenter(token);
      setPrivacy(res.privacy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load personalization center");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCategory = async (key: string, enabled: boolean) => {
    if (!token) return;
    setBusy(true);
    try {
      await personalizationApi.updatePreferences(token, {
        recommendationCategories: { [key]: enabled },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remember = async () => {
    if (!token || !rememberText.trim()) return;
    setBusy(true);
    try {
      await personalizationApi.memoryConsent(token, {
        action: "remember",
        text: rememberText.trim(),
      });
      setRememberText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preference");
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <RouteLoading label="Authenticating" />;
  if (loading) return <RouteLoading label="Loading personalization center" />;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Dream Wave AI</p>
        <h1 className="text-2xl font-semibold tracking-tight">Personalization Center</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Control what data powers your recommendations, memory, and adaptive experience.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Data used for personalization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {privacy?.dataUsed?.length ? (
            <ul className="space-y-3">
              {privacy.dataUsed.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground text-xs">Source: {item.source}</p>
                  </div>
                  <Badge variant={item.enabled ? "default" : "outline"}>
                    {item.enabled ? "Active" : "Inactive"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No data sources" description="Personalization data will appear as you use Dream Wave." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendation categories</CardTitle>
          <CardDescription>Disable categories you do not want suggested.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {privacy?.recommendationCategories
            ? Object.entries(privacy.recommendationCategories).map(([key, enabled]) => (
                <label key={key} className="flex items-center justify-between gap-4 text-sm">
                  <span className="capitalize">{key}</span>
                  <Checkbox
                    checked={enabled !== false}
                    disabled={busy}
                    onCheckedChange={(v) => void toggleCategory(key, v === true)}
                    aria-label={`Toggle ${key} recommendations`}
                  />
                </label>
              ))
            : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Memory &amp; preferences
          </CardTitle>
          <CardDescription>
            Saved memories: {privacy?.memoryCount ?? 0} · Temporary context: {privacy?.temporaryContextCount ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            value={rememberText}
            onChange={(e) => setRememberText(e.target.value)}
            placeholder='e.g. "Remember that I prefer remote internships"'
            className="max-w-md"
          />
          <Button disabled={busy || !rememberText.trim()} onClick={() => void remember()}>
            Save preference
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why am I seeing this?</CardTitle>
          <CardDescription>Recommendations use career goals, skills, deadlines, and authorized activity — never protected characteristics.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecommendationFeedbackBar recommendationKey="personalization-center-demo" recommendationType="SYSTEM" />
        </CardContent>
      </Card>
    </div>
  );
}

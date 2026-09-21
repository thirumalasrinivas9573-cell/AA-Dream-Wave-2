"use client";

import { useState } from "react";

import { RecruitmentNav } from "@/components/company/recruitment/recruitment-nav";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recruitmentApi } from "@/lib/api/recruitment";

export function CommunicationCenterPage() {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [applicationIds, setApplicationIds] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!token || !title.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await recruitmentApi.sendCommunication(token, {
        title,
        body,
        applicationIds: applicationIds.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess("Messages sent and candidates notified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  return (
    <div className="space-y-6">
      <InstitutionPageHeader eyebrow="Recruitment" title="Communication Center" description="Send application updates, reminders, and bulk announcements." />
      <RecruitmentNav />
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}
      <Card>
        <CardHeader><CardTitle>Send message</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input className="form-control" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="form-control min-h-24" placeholder="Message body" value={body} onChange={(e) => setBody(e.target.value)} />
          <input className="form-control" placeholder="Application IDs (comma-separated)" value={applicationIds} onChange={(e) => setApplicationIds(e.target.value)} />
          <Button onClick={() => void send()} disabled={!title.trim()}>Send notifications</Button>
        </CardContent>
      </Card>
    </div>
  );
}

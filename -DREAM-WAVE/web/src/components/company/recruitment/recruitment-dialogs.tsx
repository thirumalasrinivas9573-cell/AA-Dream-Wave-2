"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recruitmentApi } from "@/lib/api/recruitment";
import { useRecruitmentStore } from "@/store/recruitment-store";

type RejectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  applicationId: string;
};

export function RejectApplicationDialog({
  open,
  onOpenChange,
  token,
  applicationId,
}: RejectDialogProps) {
  const transitionStage = useRecruitmentStore((s) => s.transitionStage);
  const [internalReason, setInternalReason] = useState("");
  const [candidateMessage, setCandidateMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const ok = await transitionStage(token, applicationId, "rejected", {
      internalReason,
      candidateMessage,
    });
    setLoading(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reject candidate"
      description="Internal reason stays private. Candidate message is optional and separate."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="internalReason">Internal reason</Label>
          <select
            id="internalReason"
            className="form-control w-full"
            value={internalReason}
            onChange={(e) => setInternalReason(e.target.value)}
          >
            <option value="">Select reason…</option>
            <option value="Eligibility mismatch">Eligibility mismatch</option>
            <option value="Role requirements">Role requirements</option>
            <option value="Assessment result">Assessment result</option>
            <option value="Interview result">Interview result</option>
            <option value="Position filled">Position filled</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="candidateMessage">Candidate-facing message (optional)</Label>
          <Textarea
            id="candidateMessage"
            value={candidateMessage}
            onChange={(e) => setCandidateMessage(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={loading}>
            Reject
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type ScheduleInterviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  applicationId: string;
};

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  token,
  applicationId,
}: ScheduleInterviewDialogProps) {
  const fetchApplication = useRecruitmentStore((s) => s.fetchApplication);
  const [round, setRound] = useState("Screening");
  const [interviewType, setInterviewType] = useState("online");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [venue, setVenue] = useState("");
  const [interviewers, setInterviewers] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!date) return;
    setLoading(true);
    try {
      await recruitmentApi.scheduleInterview(token, applicationId, {
        round,
        interviewType,
        mode: interviewType === "onsite" ? "offline" : interviewType === "phone" ? "phone" : "online",
        scheduledDate: date,
        scheduledTime: time,
        meetingLink: link,
        venue,
        interviewers: interviewers.split(",").map((s) => s.trim()).filter(Boolean),
      });
      await fetchApplication(token, applicationId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Schedule interview">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="round">Round</Label>
            <select id="round" className="form-control w-full" value={round} onChange={(e) => setRound(e.target.value)}>
              {["Screening", "Technical Round 1", "Technical Round 2", "Manager Round", "HR Round", "Final Round"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Interview type</Label>
            <select id="type" className="form-control w-full" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
              {["online", "onsite", "phone", "technical", "hr", "managerial", "final_round"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel">Interviewers (comma-separated)</Label>
          <Input id="panel" value={interviewers} onChange={(e) => setInterviewers(e.target.value)} placeholder="Alice, Bob" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">Meeting link</Label>
          <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue">Venue (onsite)</Label>
          <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={loading || !date}>Schedule</Button>
        </div>
      </div>
    </Dialog>
  );
}

type ReleaseOfferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  applicationId: string;
};

export function ReleaseOfferDialog({
  open,
  onOpenChange,
  token,
  applicationId,
}: ReleaseOfferDialogProps) {
  const fetchApplication = useRecruitmentStore((s) => s.fetchApplication);
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [benefits, setBenefits] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(asDraft = false) {
    setLoading(true);
    try {
      const payload = {
        salary: Number(salary) || 0,
        location,
        benefits,
        joiningDate: joiningDate || undefined,
        expiryDate: expiryDate || undefined,
      };
      if (asDraft) {
        await recruitmentApi.createOfferDraft(token, applicationId, payload);
      } else {
        await recruitmentApi.releaseOffer(token, applicationId, payload);
      }
      await fetchApplication(token, applicationId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Offer management">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="salary">Salary (annual)</Label>
          <Input id="salary" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Work location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="benefits">Benefits</Label>
          <Input id="benefits" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="joining">Joining date</Label>
            <Input id="joining" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry">Offer expiry</Label>
            <Input id="expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => void submit(true)} disabled={loading}>Save draft</Button>
          <Button onClick={() => void submit(false)} disabled={loading}>Release offer</Button>
        </div>
      </div>
    </Dialog>
  );
}

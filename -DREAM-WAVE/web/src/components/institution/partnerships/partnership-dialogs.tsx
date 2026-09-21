"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePartnershipStore } from "@/store/partnership-store";
import {
  RELATIONSHIP_TYPES,
  type CreatePartnershipRequestPayload,
  type DiscoverableCompany,
  type DiscoverableInstitution,
  type RelationshipType,
  type SharingScope,
} from "@/types/partnership";

const SHARING_SCOPE_OPTIONS: SharingScope[] = [
  "recruitment",
  "placement",
  "events",
  "opportunities",
  "projects",
  "research",
  "programs",
];

type PartnershipRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  initiatorRole: "institution" | "company";
  targetCompany?: DiscoverableCompany | null;
  targetInstitution?: DiscoverableInstitution | null;
};

export function PartnershipRequestDialog({
  open,
  onOpenChange,
  token,
  initiatorRole,
  targetCompany,
  targetInstitution,
}: PartnershipRequestDialogProps) {
  const createRequest = usePartnershipStore((s) => s.createRequest);
  const loading = usePartnershipStore((s) => s.loading);
  const error = usePartnershipStore((s) => s.error);

  const [relationshipType, setRelationshipType] = useState<RelationshipType>("Recruitment Partner");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [proposedCollaboration, setProposedCollaboration] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedDuration, setExpectedDuration] = useState("");
  const [requestedScopes, setRequestedScopes] = useState<SharingScope[]>(["recruitment", "placement"]);

  const targetName = targetCompany?.name || targetInstitution?.name || "organization";

  async function handleSubmit() {
    const payload: CreatePartnershipRequestPayload = {
      relationshipType,
      subject,
      message,
      proposedCollaboration,
      contactPerson: { name: contactName, email: contactEmail },
      expectedDuration,
      requestedScopes,
      ...(startDate ? { startDate } : {}),
      ...(initiatorRole === "institution" && targetCompany
        ? { companyId: targetCompany._id }
        : {}),
      ...(initiatorRole === "company" && targetInstitution
        ? { institutionId: targetInstitution._id }
        : {}),
    };

    const result = await createRequest(token, payload);
    if (result) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Partnership request"
      description={`Send a partnership request to ${targetName}.`}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="relationshipType">Partnership type</Label>
          <select
            id="relationshipType"
            className="form-control w-full"
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collaboration">Proposed collaboration</Label>
          <Textarea
            id="collaboration"
            value={proposedCollaboration}
            onChange={(e) => setProposedCollaboration(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact person</Label>
            <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Expected duration</Label>
            <Input
              id="duration"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              placeholder="e.g. 2 years"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Requested sharing scopes</Label>
          <div className="flex flex-wrap gap-2">
            {SHARING_SCOPE_OPTIONS.map((scope) => (
              <label key={scope} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={requestedScopes.includes(scope)}
                  onChange={(e) => {
                    setRequestedScopes((prev) =>
                      e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                    );
                  }}
                />
                {scope}
              </label>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">Scopes are reviewed on acceptance. Does not auto-send external communication.</p>
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? "Saving…" : "Save & send request"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type PartnershipRespondDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  partnershipId: string;
  action: "accept" | "decline" | "info_requested";
};

export function PartnershipRespondDialog({
  open,
  onOpenChange,
  token,
  partnershipId,
  action,
}: PartnershipRespondDialogProps) {
  const respondToRequest = usePartnershipStore((s) => s.respondToRequest);
  const loading = usePartnershipStore((s) => s.loading);
  const [message, setMessage] = useState("");

  const titles = {
    accept: "Accept partnership",
    decline: "Decline partnership",
    info_requested: "Request more information",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={titles[action]}
      description="Add an optional message for the other party."
    >
      <div className="space-y-4">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void respondToRequest(token, partnershipId, action, message).then(() =>
                onOpenChange(false),
              );
            }}
            disabled={loading}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

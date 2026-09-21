"use client";

import {
  CalendarCheck,
  Download,
  Pencil,
  QrCode,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { ProgressBar } from "@/components/dashboard/dashboard-ui";
import {
  categoryLabel,
  EventStatusBadge,
  formatDate,
} from "@/components/institution/campus/campus-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CampusEvent } from "@/types/campus-management";

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd>
    </div>
  );
}

export function CampusEventDrawer({
  event,
  open,
  onOpenChange,
  onEdit,
  onRegister,
  onCancelRegistration,
}: {
  event: CampusEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CampusEvent) => void;
  onRegister: (event: CampusEvent) => void;
  onCancelRegistration: (event: CampusEvent) => void;
}) {
  if (!event) return null;

  const full = event.registered >= event.capacity;
  const fillPercent = event.capacity
    ? Math.round((event.registered / event.capacity) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} details`}
      hidden={!open}
    >
      <button
        type="button"
        className="bg-background/70 absolute inset-0 backdrop-blur-sm"
        aria-label="Close event details"
        onClick={() => onOpenChange(false)}
      />
      <div className="bg-card border-border scroll-region relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l p-6 shadow-[var(--shadow-lg)]">
        <div className="from-primary/15 to-primary/5 flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5">
          <span className="bg-primary/15 text-primary flex size-16 items-center justify-center rounded-2xl text-xl font-semibold">
            {event.bannerInitials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{categoryLabel(event.category)}</Badge>
              <EventStatusBadge status={event.status} />
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{event.title}</h2>
            <p className="text-muted-foreground text-sm">{event.organizer} · {event.department}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(event)}><Pencil aria-hidden="true" />Edit</Button>
          <Button type="button" size="sm" disabled={full} onClick={() => onRegister(event)}><UserPlus aria-hidden="true" />{full ? "Full" : "Register"}</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onCancelRegistration(event)}><UserMinus aria-hidden="true" />Cancel</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Download aria-hidden="true" />Download pass</Button>
        </div>

        <div className="mt-5 space-y-5">
          <p className="text-muted-foreground text-sm">{event.description}</p>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Date" value={formatDate(event.date)} />
            <Detail label="Time" value={event.time} />
            <Detail label="Venue" value={event.venue} />
            <Detail label="Mode" value={event.mode} />
            <Detail label="Capacity" value={event.capacity} />
            <Detail label="Registration deadline" value={formatDate(event.registrationDeadline)} />
          </dl>

          <Card padding="sm" className="bg-muted/20">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Registrations</span>
              <span className="text-muted-foreground">{event.registered}/{event.capacity}</span>
            </div>
            <ProgressBar value={fillPercent} />
          </Card>

          <div className="border-border flex items-center gap-3 rounded-xl border border-dashed p-4">
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
              <QrCode className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">QR attendance ready</p>
              <p className="text-muted-foreground text-xs">Check-in QR generation and scan flow are architecture-ready for the student portal.</p>
            </div>
          </div>

          {event.guestSpeakers.length ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Guest speakers</h3>
              <div className="flex flex-wrap gap-2">
                {event.guestSpeakers.map((speaker) => <Badge key={speaker} variant="outline">{speaker}</Badge>)}
              </div>
            </div>
          ) : null}

          {event.agenda.length ? (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarCheck className="size-4" aria-hidden="true" />Agenda</h3>
              <ol className="space-y-2">
                {event.agenda.map((item, index) => (
                  <li key={item} className="border-border flex items-center gap-3 rounded-xl border p-3">
                    <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-semibold">{index + 1}</span>
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Briefcase,
  ExternalLink,
  GraduationCap,
  Pencil,
  Printer,
  Send,
} from "lucide-react";
import { useState } from "react";

import {
  formatCurrency,
  formatStipend,
  ListingStatusBadge,
  OfferStatusBadge,
  PlacementStatusBadge,
} from "@/components/institution/placements/placement-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  Internship,
  Job,
  Offer,
  Recruiter,
} from "@/types/placement-management";

const TABS = ["overview", "openings", "recruitment", "process"] as const;
type CompanyTab = (typeof TABS)[number];

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd>
    </div>
  );
}

function TagList({ values }: { values: string[] }) {
  return values.length ? (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">{value}</Badge>
      ))}
    </div>
  ) : (
    <p className="text-muted-foreground text-sm">No records added.</p>
  );
}

export function CompanyProfileDrawer({
  recruiter,
  internships,
  jobs,
  offers,
  open,
  onOpenChange,
  onEdit,
  onNotify,
}: {
  recruiter: Recruiter | null;
  internships: Internship[];
  jobs: Job[];
  offers: Offer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (recruiter: Recruiter) => void;
  onNotify: (recruiter: Recruiter) => void;
}) {
  const [tab, setTab] = useState<CompanyTab>("overview");

  if (!recruiter) return null;

  const companyInternships = internships.filter((i) => i.companyId === recruiter.id);
  const companyJobs = jobs.filter((j) => j.companyId === recruiter.id);
  const companyOffers = offers.filter((o) => o.companyId === recruiter.id);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${recruiter.name} profile`}
      hidden={!open}
    >
      <button
        type="button"
        className="bg-background/70 absolute inset-0 backdrop-blur-sm"
        aria-label="Close company profile"
        onClick={() => onOpenChange(false)}
      />
      <div className="bg-card border-border scroll-region relative flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l p-6 shadow-[var(--shadow-lg)]">
        <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-lg font-semibold">
              {recruiter.logoInitials}
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{recruiter.name}</h2>
              <p className="text-muted-foreground text-sm">{recruiter.industry} · {recruiter.location}</p>
              <div className="mt-1"><PlacementStatusBadge status={recruiter.driveStatus} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(recruiter)}><Pencil aria-hidden="true" />Edit</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Printer aria-hidden="true" />Print</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onNotify(recruiter)}><Send aria-hidden="true" />Notify</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Company profile sections">
          {TABS.map((item) => (
            <Button key={item} type="button" role="tab" size="sm" variant={tab === item ? "default" : "ghost"} aria-selected={tab === item} className="capitalize" onClick={() => setTab(item)}>
              {item}
            </Button>
          ))}
        </div>

        <div role="tabpanel" className="mt-4 flex-1">
          {tab === "overview" ? (
            <section className="space-y-5">
              <p className="text-muted-foreground text-sm">{recruiter.about}</p>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Industry" value={recruiter.industry} />
                <Detail label="HR contact" value={recruiter.hrContact} />
                <Detail label="Email" value={recruiter.email} />
                <Detail label="Phone" value={recruiter.phone} />
                <Detail label="Location" value={recruiter.location} />
                <Detail label="Past placements" value={recruiter.pastPlacements} />
              </dl>
              {recruiter.website ? (
                <a href={recruiter.website} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-sm hover:underline">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {recruiter.website}
                </a>
              ) : null}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Hiring departments</h3>
                <TagList values={recruiter.hiringDepartments} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Required skills</h3>
                <TagList values={recruiter.requiredSkills} />
              </div>
            </section>
          ) : null}

          {tab === "openings" ? (
            <section className="space-y-5">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Briefcase className="size-4" aria-hidden="true" />Internships ({companyInternships.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {companyInternships.length ? companyInternships.map((internship) => (
                    <Card key={internship.id} padding="sm">
                      <p className="font-medium">{internship.title}</p>
                      <p className="text-muted-foreground text-xs">{internship.duration} · {internship.workMode} · {internship.location}</p>
                      <p className="mt-1 text-xs">{formatStipend(internship.stipend)} · {internship.openPositions} positions</p>
                      <div className="mt-2"><ListingStatusBadge status={internship.status} /></div>
                    </Card>
                  )) : <p className="text-muted-foreground text-sm">No internships listed.</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4" aria-hidden="true" />Job opportunities ({companyJobs.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {companyJobs.length ? companyJobs.map((job) => (
                    <Card key={job.id} padding="sm">
                      <p className="font-medium">{job.title}</p>
                      <p className="text-muted-foreground text-xs">{job.jobType} · {job.experience} · {job.location}</p>
                      <p className="mt-1 text-xs">{formatCurrency(job.salary)}</p>
                      <div className="mt-2"><ListingStatusBadge status={job.status} /></div>
                    </Card>
                  )) : <p className="text-muted-foreground text-sm">No jobs listed.</p>}
                </div>
              </div>
            </section>
          ) : null}

          {tab === "recruitment" ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Recruitment history & offers ({companyOffers.length})</h3>
              {companyOffers.length ? companyOffers.map((offer) => (
                <div key={offer.id} className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">{offer.studentName}</p>
                    <p className="text-muted-foreground text-xs">{offer.role} · {offer.department} · {formatCurrency(offer.salary)}</p>
                  </div>
                  <OfferStatusBadge status={offer.status} />
                </div>
              )) : <p className="text-muted-foreground text-sm">No offers recorded.</p>}
            </section>
          ) : null}

          {tab === "process" ? (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Hiring process</h3>
              {recruiter.hiringProcess.length ? (
                <ol className="space-y-2">
                  {recruiter.hiringProcess.map((step, index) => (
                    <li key={step} className="border-border flex items-center gap-3 rounded-xl border p-3">
                      <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-semibold">{index + 1}</span>
                      <span className="text-sm font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-muted-foreground text-sm">No hiring process defined.</p>}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

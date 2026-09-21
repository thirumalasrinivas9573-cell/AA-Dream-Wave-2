"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { CtaButton } from "@/components/shared/cta-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LANDING_FAQS,
  LANDING_OVERVIEWS,
  LANDING_PRICING,
} from "@/constants/landing";
import { MARKETING_AUTH_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export function PlatformOverviewSection() {
  return (
    <section
      id="platform"
      aria-labelledby="platform-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Overview
          </p>
          <h2
            id="platform-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            One platform for every learning role
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Explore how Dream Wave serves students, institutions, companies,
            knowledge libraries, and animated learning — without fragmenting the
            experience.
          </p>
        </ScrollReveal>

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LANDING_OVERVIEWS.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.id} id={item.id}>
                <ScrollReveal delay={Math.min(index * 0.05, 0.2)}>
                  <Card interactive className="hover:bg-muted/20 h-full">
                    <CardHeader>
                      <div className="bg-muted mb-2 inline-flex size-9 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-muted-foreground mb-4 space-y-1.5 text-sm">
                        {item.points.map((point) => (
                          <li key={point}>· {point}</li>
                        ))}
                      </ul>
                      <Link
                        href={item.href}
                        className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Learn more
                      </Link>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app">
        <ScrollReveal className="mb-12 mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Clear plans for learners and organizations
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Start free, scale to Pro, or partner for Enterprise — without
            locking your team into complexity.
          </p>
        </ScrollReveal>

        <ul className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-3">
          {LANDING_PRICING.map((plan, index) => (
            <li key={plan.id}>
              <ScrollReveal delay={Math.min(index * 0.06, 0.18)}>
                <Card
                  className={cn(
                    "flex h-full flex-col",
                    plan.featured && "ring-ring ring-2",
                  )}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="pt-2 text-3xl font-semibold tracking-tight">
                      {plan.price}
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        {plan.period}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <ul className="text-muted-foreground flex-1 space-y-2 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature}>· {feature}</li>
                      ))}
                    </ul>
                    <CtaButton
                      href={
                        plan.id === "enterprise"
                          ? "#contact"
                          : MARKETING_AUTH_ROUTES.getStarted
                      }
                      variant={plan.featured ? "primary" : "secondary"}
                    >
                      {plan.cta}
                    </CtaButton>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(LANDING_FAQS[0]?.id ?? null);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ScrollReveal>
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Answers before you start
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Quick clarity on who Dream Wave serves and how the experience fits
            together.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.06} className="space-y-2">
          {LANDING_FAQS.map((item) => {
            const open = openId === item.id;
            const panelId = `faq-panel-${item.id}`;
            const buttonId = `faq-button-${item.id}`;
            return (
              <div
                key={item.id}
                className="border-border overflow-hidden rounded-2xl border"
              >
                <button
                  type="button"
                  id={buttonId}
                  className="nav-feedback hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium outline-none focus-visible:ring-2"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  {item.question}
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {open ? (
                  <p
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="text-muted-foreground border-border border-t px-4 py-3 text-sm text-pretty"
                  >
                    {item.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}

export function ContactSection() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim() || !email.includes("@")) next.email = "Enter a valid email.";
    if (!message.trim() || message.trim().length < 10) {
      next.message = "Please share a short message (10+ characters).";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSent(true);
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="border-border border-t py-20 sm:py-24"
    >
      <div className="container-app grid gap-10 lg:grid-cols-2 lg:items-start">
        <ScrollReveal>
          <p className="text-muted-foreground text-sm font-medium tracking-[0.16em] uppercase">
            Contact
          </p>
          <h2
            id="contact-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Talk with the Dream Wave team
          </h2>
          <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
            Questions about Enterprise rollout, institution pilots, or product
            fit? Send a note — we respond within one business day.
          </p>
          <p className="mt-4 text-sm">
            Email{" "}
            <a
              href="mailto:hello@dreamwave.ai"
              className="font-medium underline-offset-4 hover:underline"
            >
              hello@dreamwave.ai
            </a>
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle>Contact form</CardTitle>
              <CardDescription>
                Frontend validation only — no backend changes in this milestone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite">
                  Thanks — your message is ready to send. Connect your contact
                  API when available.
                </p>
              ) : (
                <form className="space-y-3" onSubmit={submit} noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">
                      Name <span className="text-destructive" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                      autoComplete="name"
                    />
                    {errors.name ? (
                      <p id="contact-name-error" role="alert" className="text-destructive text-xs">
                        {errors.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">
                      Email <span className="text-destructive" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                      autoComplete="email"
                    />
                    {errors.email ? (
                      <p id="contact-email-error" role="alert" className="text-destructive text-xs">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">
                      Message <span className="text-destructive" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-28"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "contact-message-error" : undefined}
                    />
                    {errors.message ? (
                      <p id="contact-message-error" role="alert" className="text-destructive text-xs">
                        {errors.message}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" className="h-10">
                    Send message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}

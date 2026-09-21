"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { RouteLoading } from "@/components/common/route-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EVENT_ROUTES } from "@/constants/events";
import {
  EVENT_CATEGORY_FILTERS,
  eventsApi,
  type UnifiedEvent,
} from "@/lib/api/events";

export function EventsDiscoveryPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [hasInstitutionLink, setHasInstitutionLink] = useState(true);

  const load = useCallback(async () => {
    if (!token || user?.role !== "student") return;
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.browse(token, {
        category: category || undefined,
        q: query || undefined,
        upcoming: "true",
      });
      setItems(res.items);
      setHasInstitutionLink(res.hasInstitutionLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, category, query]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token || user?.role !== "student") {
    return <RouteLoading label="Authenticating" />;
  }

  if (loading) return <RouteLoading label="Loading events" />;

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-medium">Discover</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Events & Hackathons</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Real events from your institution — workshops, hackathons, career events, and research opportunities.
          </p>
        </div>
        <Link href={EVENT_ROUTES.my} className={buttonVariants({ variant: "outline" })}>
          My events
        </Link>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!hasInstitutionLink ? (
        <EmptyState
          title="Institution link required"
          description="Connect to an institution to discover campus events and hackathons."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search & filter</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-3 left-3 size-4" aria-hidden="true" />
                <Input
                  className="pl-9"
                  placeholder="Search title, organizer, skills…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search events"
                />
              </div>
              <Button type="button" onClick={() => void load()}>
                Search
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORY_FILTERS.map((f) => (
              <Button
                key={f.label}
                type="button"
                size="sm"
                variant={category === f.value ? "default" : "outline"}
                onClick={() => setCategory(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No events found"
              description="No published events match your filters. Try a different category or check back later."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((event) => (
                <Card key={`${event.source}-${event.id}`} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{event.category.replace(/_/g, " ")}</Badge>
                      {event.isRegistered ? <Badge>Registered</Badge> : null}
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description || "NOT PROVIDED"}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : "NOT PROVIDED"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {event.mode}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">Organizer: {event.organizer}</p>
                    <Link href={EVENT_ROUTES.details(event.source, event.id)} className={buttonVariants({ className: "w-full" })}>
                      View details
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

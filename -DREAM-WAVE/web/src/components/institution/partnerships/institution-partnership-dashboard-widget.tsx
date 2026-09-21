"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTITUTION_ROUTES } from "@/constants/institution";
import { usePartnershipStore } from "@/store/partnership-store";

/** Lightweight partnership summary for institution dashboard — no layout redesign. */
export function InstitutionPartnershipDashboardWidget() {
  const { token } = useAuth();
  const stats = usePartnershipStore((s) => s.stats);
  const fetchStats = usePartnershipStore((s) => s.fetchStats);

  useEffect(() => {
    if (token) void fetchStats(token);
  }, [token, fetchStats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Industry partnerships</CardTitle>
        <CardDescription>
          Connected companies and pending collaboration requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Active partners</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {stats?.activePartners ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pending</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {stats?.pendingInvitations ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recruitment</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {stats?.recruitmentPartners ?? "—"}
            </dd>
          </div>
        </dl>
        <Link href={INSTITUTION_ROUTES.industryNetwork} className={buttonVariants({ variant: "outline" })}>
          Open Industry Network
        </Link>
      </CardContent>
    </Card>
  );
}

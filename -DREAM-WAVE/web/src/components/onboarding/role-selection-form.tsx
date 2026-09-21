"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLATFORM_ROLES, type PlatformRole } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants/storage";
import { cn } from "@/lib/utils";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "@/utils/storage";

export function getDraftRole(): PlatformRole | null {
  const value = getStorageItem(STORAGE_KEYS.onboardingRole);
  if (
    value === "student" ||
    value === "institution" ||
    value === "company" ||
    value === "admin"
  ) {
    return value;
  }
  return null;
}

export function setDraftRole(role: PlatformRole) {
  setStorageItem(STORAGE_KEYS.onboardingRole, role);
}

export function clearDraftRole() {
  removeStorageItem(STORAGE_KEYS.onboardingRole);
}

/**
 * Step 1 — choose platform role.
 */
export function RoleSelectionForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlatformRole | null>(
    () => getDraftRole(),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-muted-foreground text-sm">Step 1 of 2</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          How will you use Dream Wave?
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Choose a role so we can tailor your workspace. You can switch later
          from settings once multi-role admin is available.
        </p>
      </div>

      {error ? (
        <AuthAlert variant="error" title="Select a role" description={error} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORM_ROLES.map((role) => {
          const active = selected === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                setSelected(role.id);
                setError(null);
              }}
              className={cn(
                "focus-visible:ring-ring rounded-2xl text-left transition outline-none focus-visible:ring-2",
                active ? "ring-ring ring-2" : "",
              )}
              aria-pressed={active}
            >
              <Card
                className={cn(
                  "h-full transition-colors",
                  active ? "bg-muted/40" : "hover:bg-muted/20",
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{role.title}</CardTitle>
                    {active ? (
                      <span className="bg-primary text-primary-foreground inline-flex size-6 items-center justify-center rounded-full">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                  <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
                    {role.highlights.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-10 min-w-36"
          onClick={() => {
            if (!selected) {
              setError("Pick the role that best matches your account.");
              return;
            }
            setDraftRole(selected);
            router.push(ROUTES.onboardingDetails);
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

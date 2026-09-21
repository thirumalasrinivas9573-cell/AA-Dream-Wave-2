"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_VERSION } from "@/constants";
import { getRoleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { studentService } from "@/services/student.service";
import type { AuthUser } from "@/types/auth";

export function SettingsPage() {
  const { user, token, updateUser, refreshUser } = useAuth();
  const remoteName = user?.name ?? "";
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [syncedName, setSyncedName] = useState(remoteName);
  if (remoteName !== syncedName) {
    setSyncedName(remoteName);
    setNameDraft(null);
  }
  const name = nameDraft ?? syncedName;

  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | undefined>(user?.credits);
  const [streak, setStreak] = useState<number | undefined>(user?.streak);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    queueMicrotask(() => {
      void (async () => {
        if (!active) return;
        setLoadingProfile(true);
        setError(null);
        try {
          const data = await studentService.profile.get(token);
          if (!active || !data.user) return;
          const current = userRef.current;
          const next: AuthUser = {
            ...(current ?? data.user),
            ...data.user,
            id: data.user.id || current?.id || "",
            name: data.user.name || current?.name || "",
            email: data.user.email || current?.email || "",
          };
          updateUser(next);
          setCredits(next.credits);
          setStreak(next.streak);
        } catch (err) {
          if (!active) return;
          setError(toUserSafeMessage(err));
        } finally {
          if (active) setLoadingProfile(false);
        }
      })();
    });

    return () => {
      active = false;
    };
  }, [token, updateUser]);

  const saveProfile = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await studentService.profile.update(
        { name: name.trim() },
        token,
      );
      if (data.user) {
        const next: AuthUser = {
          ...(user ?? data.user),
          ...data.user,
          id: data.user.id || user?.id || "",
          name: data.user.name,
          email: data.user.email || user?.email || "",
        };
        updateUser(next);
        setNameDraft(null);
      } else {
        await refreshUser();
      }
      setSuccess("Profile updated.");
    } catch (err) {
      setError(toUserSafeMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Account</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Profile details synced from Dream Wave API, appearance, and
            workspace shortcuts.
          </p>
        </div>
        <ThemeToggle />
      </header>

      {error ? (
        <AuthAlert
          variant="error"
          title="Profile sync notice"
          description={error}
        />
      ) : null}
      {success ? (
        <AuthAlert variant="success" title="Saved" description={success} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              {loadingProfile
                ? "Loading profile from API…"
                : `${user?.email ?? "Signed in"} · ${getRoleLabel(user?.role)}`}
            </CardDescription>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Display name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(event) => setNameDraft(event.target.value)}
                  aria-label="Display name"
                />
              </div>
              <dl className="space-y-3 text-sm">
                {user?.organizationName ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground">Organization</dt>
                    <dd>{user.organizationName}</dd>
                  </div>
                ) : null}
                {user?.learningGoal ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground">Learning goal</dt>
                    <dd className="text-right text-pretty">
                      {user.learningGoal}
                    </dd>
                  </div>
                ) : null}
                {typeof credits === "number" ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground">Credits</dt>
                    <dd>{credits}</dd>
                  </div>
                ) : null}
                {typeof streak === "number" ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground">Streak</dt>
                    <dd>{streak} days</dd>
                  </div>
                ) : null}
                {user?.aaid ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">AAID</dt>
                    <dd className="font-mono text-xs sm:text-sm">{user.aaid}</dd>
                  </div>
                ) : null}
              </dl>
              <Button
                type="button"
                disabled={saving || !name.trim() || name.trim() === user?.name}
                onClick={() => void saveProfile()}
              >
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>
              Jump back into high-value platform surfaces.
            </CardDescription>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={ROUTES.dashboard}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start",
                )}
              >
                AI Dashboard & personalization
              </Link>
              <Link
                href={ROUTES.workspace}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start",
                )}
              >
                Smart workspace
              </Link>
              <Link
                href={ROUTES.ai}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start",
                )}
              >
                AI Studio
              </Link>
              <Link
                href={ROUTES.community}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start",
                )}
              >
                Community
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Dream Wave Frontend Version {APP_VERSION}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

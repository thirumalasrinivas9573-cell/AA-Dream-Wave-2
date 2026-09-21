"use client";

import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Spinner } from "@/components/common/spinner";
import { EntityForm } from "@/components/institution/entity-form";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { institutionFoundationApi, type InstitutionFoundationProfile } from "@/lib/api/institution-foundation";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { useInstitutionStore } from "@/store/institution-store";
import type { InstitutionProfile, InstitutionSettings } from "@/types/institution";

export function InstitutionProfilePage() {
  const { token } = useAuth();
  const useLiveApi = Boolean(token) && !isInstitutionDemoDataEnabled();
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const profile = useInstitutionStore((s) => s.profile);
  const updateProfile = useInstitutionStore((s) => s.updateProfile);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!useLiveApi || !token) return;
    void institutionFoundationApi.getProfile(token).then((res) => {
      updateProfile({
        name: res.profile.name,
        type: (res.profile.type as InstitutionProfile["type"]) || "college",
        code: res.profile.code,
        email: res.profile.email,
        phone: res.profile.phone,
        website: res.profile.website,
        address: res.profile.address,
        city: res.profile.city,
        state: res.profile.state,
        country: res.profile.country,
        description: res.profile.description,
      });
    });
  }, [useLiveApi, token, updateProfile]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading profile" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title="Institution profile"
        description="Public and operational identity for your organization."
      />
      {saved ? (
        <AuthAlert
          variant="success"
          title="Profile updated"
          description={useLiveApi ? "Institution profile synced to the platform." : "Institution profile details were saved locally."}
        />
      ) : null}
      {error ? (
        <AuthAlert variant="error" title="Save failed" description={error} />
      ) : null}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <div className="mt-4">
            <EntityForm
              initialValues={{
                name: profile.name,
                type: profile.type,
                code: profile.code,
                email: profile.email,
                phone: profile.phone,
                website: profile.website,
                address: profile.address,
                city: profile.city,
                state: profile.state,
                country: profile.country,
                accreditation: profile.accreditation,
                establishedYear: profile.establishedYear,
                description: profile.description,
              }}
              fields={[
                { name: "name", label: "Institution name", required: true },
                {
                  name: "type",
                  label: "Type",
                  type: "select",
                  required: true,
                  options: [
                    { value: "college", label: "College" },
                    { value: "school", label: "School" },
                    { value: "university", label: "University" },
                    { value: "training", label: "Training center" },
                  ],
                },
                { name: "code", label: "Institution code", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "phone", label: "Phone", required: true },
                { name: "website", label: "Website" },
                { name: "address", label: "Address", required: true },
                { name: "city", label: "City", required: true },
                { name: "state", label: "State", required: true },
                { name: "country", label: "Country", required: true },
                { name: "accreditation", label: "Accreditation" },
                { name: "establishedYear", label: "Established year" },
                {
                  name: "description",
                  label: "Description",
                  type: "textarea",
                },
              ]}
              onCancel={() => setSaved(false)}
              onSubmit={async (values) => {
                setError(null);
                setLoading(true);
                try {
                  if (useLiveApi && token) {
                    const payload: Partial<InstitutionFoundationProfile> = {};
                    if (values.name) payload.name = values.name;
                    if (values.type) payload.type = values.type;
                    if (values.code) payload.code = values.code;
                    if (values.email) payload.email = values.email;
                    if (values.phone) payload.phone = values.phone;
                    if (values.website) payload.website = values.website;
                    if (values.address) payload.address = values.address;
                    if (values.city) payload.city = values.city;
                    if (values.state) payload.state = values.state;
                    if (values.country) payload.country = values.country;
                    if (values.description) payload.description = values.description;
                    await institutionFoundationApi.updateProfile(token, payload);
                  }
                  updateProfile(values as unknown as Partial<InstitutionProfile>);
                  setSaved(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to save profile");
                } finally {
                  setLoading(false);
                }
              }}
              submitLabel={loading ? "Saving…" : "Save profile"}
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export function InstitutionSettingsPage() {
  const hydrated = useInstitutionStore((s) => s.hydrated);
  const hydrate = useInstitutionStore((s) => s.hydrate);
  const settings = useInstitutionStore((s) => s.settings);
  const updateSettings = useInstitutionStore((s) => s.updateSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading settings" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-8 md:py-10">
      <InstitutionPageHeader
        title="Organization settings"
        description="Academic year defaults, notifications, and workspace preferences."
      />
      {saved ? (
        <AuthAlert
          variant="success"
          title="Settings saved"
          description="Organization settings were updated."
        />
      ) : null}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <div className="mt-4">
            <EntityForm
              initialValues={{
                timezone: settings.timezone,
                academicYear: settings.academicYear,
                defaultLanguage: settings.defaultLanguage,
                allowSelfEnrollment: settings.allowSelfEnrollment
                  ? "true"
                  : "false",
                notifyParents: settings.notifyParents ? "true" : "false",
              }}
              fields={[
                { name: "timezone", label: "Timezone", required: true },
                {
                  name: "academicYear",
                  label: "Academic year",
                  required: true,
                },
                {
                  name: "defaultLanguage",
                  label: "Default language",
                  required: true,
                },
                {
                  name: "allowSelfEnrollment",
                  label: "Allow self enrollment",
                  type: "select",
                  options: [
                    { value: "true", label: "Enabled" },
                    { value: "false", label: "Disabled" },
                  ],
                },
                {
                  name: "notifyParents",
                  label: "Notify parents/guardians",
                  type: "select",
                  options: [
                    { value: "true", label: "Enabled" },
                    { value: "false", label: "Disabled" },
                  ],
                },
              ]}
              onCancel={() => setSaved(false)}
              onSubmit={(values) => {
                updateSettings({
                  timezone: values.timezone || settings.timezone,
                  academicYear: values.academicYear || settings.academicYear,
                  defaultLanguage:
                    values.defaultLanguage || settings.defaultLanguage,
                  allowSelfEnrollment: values.allowSelfEnrollment === "true",
                  notifyParents: values.notifyParents === "true",
                } satisfies Partial<InstitutionSettings>);
                setSaved(true);
              }}
              submitLabel="Save settings"
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

"use client";

import { ADMISSIONS_SEED } from "@/constants/admissions-seed";
import { STORAGE_KEYS } from "@/constants/storage";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  AdmissionApplication,
  AdmissionInterview,
  AdmissionRemark,
  AdmissionStatus,
} from "@/types/admissions";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

type NewAdmission = Pick<
  AdmissionApplication,
  | "fullName"
  | "email"
  | "phone"
  | "gender"
  | "dateOfBirth"
  | "department"
  | "course"
  | "qualification"
  | "city"
  | "state"
  | "assignedOfficer"
>;

type AdmissionsStore = {
  applications: AdmissionApplication[];
  hydrated: boolean;
  hydrate: () => void;
  addApplication: (application: NewAdmission) => AdmissionApplication;
  importApplications: (applications: NewAdmission[]) => number;
  updateStatus: (id: string, status: AdmissionStatus) => void;
  updateInterview: (id: string, interview: AdmissionInterview) => void;
  addRemark: (id: string, text: string, author: string) => void;
};

function persist(applications: AdmissionApplication[]) {
  setJsonStorageItem(STORAGE_KEYS.institutionAdmissions, applications);
}

function createApplication(
  input: NewAdmission,
  sequence: number,
): AdmissionApplication {
  const now = new Date();
  const applicationDate = now.toISOString().slice(0, 10);
  const year = String(now.getFullYear());
  const id = `ADM-${year}-${String(sequence).padStart(4, "0")}`;
  const initials = input.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    ...input,
    id,
    photoInitials: initials,
    address: "",
    country: "India",
    nationality: "Indian",
    applicationDate,
    admissionYear: year,
    status: "pending",
    academicHistory: [],
    guardian: {
      fatherName: "",
      motherName: "",
      guardianName: "",
      occupation: "",
      phone: "",
      email: "",
    },
    documents: [
      "10th Memo",
      "12th Memo",
      "Degree Certificate",
      "Transfer Certificate",
      "Migration Certificate",
      "Community Certificate",
      "Income Certificate",
      "Passport Photo",
      "Identity Proof",
    ].map((name, index) => ({
      id: `${id}-document-${index + 1}`,
      name: name as AdmissionApplication["documents"][number]["name"],
      status: "missing",
    })),
    interview: {
      status: "not-scheduled",
      panel: [],
      remarks: "",
    },
    timeline: [
      "Application Submitted",
      "Documents Uploaded",
      "Documents Verified",
      "Interview Scheduled",
      "Interview Completed",
      "Admission Approved",
      "Fee Confirmation",
      "Enrollment Completed",
    ].map((label, index) => ({
      id: `${id}-timeline-${index + 1}`,
      label,
      completed: index === 0,
      ...(index === 0 ? { date: applicationDate } : {}),
    })),
    remarks: [],
  };
}

export const useAdmissionsStore = createAppStore<AdmissionsStore>((set, get) => ({
  applications: isInstitutionDemoDataEnabled() ? ADMISSIONS_SEED : [],
  hydrated: false,
  hydrate: () => {
    const stored = getJsonStorageItem<AdmissionApplication[]>(
      STORAGE_KEYS.institutionAdmissions,
    );
    set({
      applications:
        Array.isArray(stored) && stored.length
          ? stored
          : isInstitutionDemoDataEnabled()
            ? ADMISSIONS_SEED
            : [],
      hydrated: true,
    });
  },
  addApplication: (input) => {
    const application = createApplication(input, Date.now() % 10000);
    const applications = [application, ...get().applications];
    persist(applications);
    set({ applications });
    return application;
  },
  importApplications: (inputs) => {
    const base = Date.now() % 10000;
    const imported = inputs.map((input, index) =>
      createApplication(input, base + index),
    );
    const applications = [...imported, ...get().applications];
    persist(applications);
    set({ applications });
    return imported.length;
  },
  updateStatus: (id, status) => {
    const applications = get().applications.map((application) =>
      application.id === id ? { ...application, status } : application,
    );
    persist(applications);
    set({ applications });
  },
  updateInterview: (id, interview) => {
    const applications = get().applications.map((application) => {
      if (application.id !== id) return application;
      const timeline = application.timeline.map((event) =>
        event.label === "Interview Scheduled"
          ? {
              ...event,
              completed: interview.status === "scheduled",
              ...(interview.date ? { date: interview.date } : {}),
            }
          : event,
      );
      return {
        ...application,
        interview,
        timeline,
        status:
          interview.status === "scheduled"
            ? ("interview-scheduled" as const)
            : interview.status === "cancelled" &&
                application.status === "interview-scheduled"
              ? ("under-review" as const)
            : application.status,
      };
    });
    persist(applications);
    set({ applications });
  },
  addRemark: (id, text, author) => {
    const remark: AdmissionRemark = {
      id: `remark-${Date.now().toString(36)}`,
      text,
      author,
      createdAt: new Date().toISOString(),
    };
    const applications = get().applications.map((application) =>
      application.id === id
        ? { ...application, remarks: [remark, ...application.remarks] }
        : application,
    );
    persist(applications);
    set({ applications });
  },
}));

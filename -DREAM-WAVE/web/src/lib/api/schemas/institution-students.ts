import { z } from "zod";

import {
  PLACEMENT_STATUS_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from "@/components/institution/students/student-management-ui";

const academicStatuses = STUDENT_STATUS_OPTIONS.map((o) => o.value);
const placementStatuses = PLACEMENT_STATUS_OPTIONS.map((o) => o.value);

export const institutionListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  course: z.string().max(100).optional(),
  semester: z.string().max(50).optional(),
  section: z.string().max(20).optional(),
  batch: z.string().max(20).optional(),
  status: z.enum(academicStatuses as [string, ...string[]]).optional(),
  placementStatus: z.enum(placementStatuses as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  sort: z
    .enum(["studentId", "rollNumber", "fullName", "department", "course", "semester", "status"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const institutionCreateStudentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  department: z.string().max(100).optional(),
  course: z.string().max(100).optional(),
  semester: z.string().max(50).optional(),
  section: z.string().max(20).optional(),
  batch: z.string().max(20).optional(),
  status: z.enum(academicStatuses as [string, ...string[]]).optional(),
});

export type InstitutionListQuery = z.infer<typeof institutionListQuerySchema>;
export type InstitutionCreateStudentInput = z.infer<typeof institutionCreateStudentSchema>;

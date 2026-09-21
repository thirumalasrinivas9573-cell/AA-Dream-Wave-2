import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { INSTITUTION_ROUTES } from "@/constants/institution";

export const metadata: Metadata = {
  title: "Institution Portal",
  description: "Institution operations portal",
};

export default function Page() {
  redirect(INSTITUTION_ROUTES.dashboard);
}

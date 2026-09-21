import { redirect } from "next/navigation";

import { COMPANY_ROUTES } from "@/constants/partnership";

export default function CompanyRootPage() {
  redirect(COMPANY_ROUTES.dashboard);
}

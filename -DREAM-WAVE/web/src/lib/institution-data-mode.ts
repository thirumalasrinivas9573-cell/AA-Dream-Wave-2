/**
 * Institution portal data source.
 * Demo seed data is OFF by default — use live backend + real records only.
 */
export function isInstitutionDemoDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INSTITUTION_DEMO_DATA === "true";
}

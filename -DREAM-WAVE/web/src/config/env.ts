import { z } from "zod";

/**
 * Dream Wave — Safe public environment validation.
 *
 * Validates NEXT_PUBLIC_* values only. Server secrets are placeholders in
 * `.env.example` and must never be read into client bundles here.
 */

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Dream Wave"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_API_BASE_URL: z.url().default("http://localhost:5001/api"),
  NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFromString,
  NEXT_PUBLIC_ENABLE_THREE_JS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readProcessEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_THREE_JS: process.env.NEXT_PUBLIC_ENABLE_THREE_JS,
  };
}

/**
 * Parse and validate public env. Falls back to schema defaults when unset.
 * Throws only when a provided value is invalid (never silently corrupt).
 */
export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(readProcessEnv());

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid public environment configuration: ${details}`);
  }

  return result.data;
}

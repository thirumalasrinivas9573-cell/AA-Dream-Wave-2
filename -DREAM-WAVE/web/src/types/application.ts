export type AppEnvironment = "development" | "test" | "staging" | "production";

export type ApplicationMeta = {
  name: string;
  version: string;
  environment: AppEnvironment;
  url: string;
};

/**
 * Dream Wave — Application error architecture (foundation).
 *
 * Typed errors for future UI and service layers.
 * No business logic or API mapping in Prompt 1.2.
 */

export type AppErrorCode =
  | "UNKNOWN"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NETWORK"
  | "TIMEOUT";

export type AppErrorOptions = {
  code?: AppErrorCode;
  status?: number;
  cause?: unknown;
  isOperational?: boolean;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly isOperational: boolean;
  override readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.code = options.code ?? "UNKNOWN";
    this.status = options.status ?? 500;
    this.isOperational = options.isOperational ?? true;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toUserSafeMessage(error: unknown): string {
  if (isAppError(error) && error.isOperational) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

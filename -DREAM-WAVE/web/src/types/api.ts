/**
 * Generic API types — no business models.
 */

export type ApiResult<T> = {
  data: T;
  success: boolean;
  message?: string;
};

export type ApiErrorBody = {
  message: string;
  code?: string;
  status?: number;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

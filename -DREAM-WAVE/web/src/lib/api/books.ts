import { apiRequest } from "@/lib/api/client";
import type { Book, BooksResponse } from "@/types/student";

export const booksApi = {
  list: (token: string, query?: string) => {
    const path = query?.trim()
      ? `/books?query=${encodeURIComponent(query.trim())}`
      : "/books";
    return apiRequest<BooksResponse>(path, { method: "GET", token });
  },

  recommend: (goal: string, token: string) =>
    apiRequest<BooksResponse>("/books/recommend", {
      method: "POST",
      body: { goal },
      token,
    }),
};

export type { Book };

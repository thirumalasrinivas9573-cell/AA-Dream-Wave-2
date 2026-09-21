export const EVENT_ROUTES = {
  root: "/events",
  my: "/events/my",
  details: (source: string, id: string) => `/events/${source}/${id}`,
} as const;

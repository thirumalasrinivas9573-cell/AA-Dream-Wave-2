export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type MaybePromise<T> = T | Promise<T>;

export type Dictionary<T = unknown> = Record<string, T>;

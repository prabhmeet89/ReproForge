export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Normalises pagination input.
 *
 * The Zod query schemas already coerce these values, but the repositories
 * clamp again — they are also called from the seed and from tests, which do
 * not go through the HTTP layer.
 */
export function resolvePagination(page?: number, limit?: number): PaginationParams {
  const safePage =
    Number.isFinite(page) ? Math.max(1, Math.floor(page as number)) : DEFAULT_PAGE;

  const safeLimit = Number.isFinite(limit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit as number)))
    : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Resolves a sort token against a whitelist.
 *
 * The token that arrives from the query string is never used to build an
 * `orderBy` — it is only ever a key into a fixed map of known orderings. A
 * token that is not in the map falls back to the default, so an unknown
 * value can never reach Prisma.
 */
export function resolveSort<T>(
  whitelist: Record<string, T>,
  sort: string | undefined,
  fallback: T
): T {
  if (!sort) return fallback;
  return Object.prototype.hasOwnProperty.call(whitelist, sort) ? whitelist[sort] : fallback;
}

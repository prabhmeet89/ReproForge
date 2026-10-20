import { AppError } from "./appError";

/**
 * Prisma error codes that have a meaningful HTTP counterpart.
 *
 * P2002 — a unique constraint was violated (the resource already exists).
 * P2025 — the record the operation targeted does not exist.
 * P2003 — a foreign key constraint failed (the referenced record is gone).
 */
const PRISMA_ERROR_FACTORIES: Record<string, () => AppError> = {
  P2002: () => AppError.conflict("Resource already exists"),
  P2025: () => AppError.notFound("Resource not found"),
  P2003: () => AppError.unprocessableEntity("Referenced resource does not exist"),
};

/**
 * Detects a Prisma client error.
 *
 * The check is duck-typed on the `code` property rather than an
 * `instanceof` test, because the Prisma error classes are not stable
 * across module instances (a common problem when a package is bundled or
 * loaded twice).
 */
export function isPrismaError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^P\d{4}$/.test(code);
}

/**
 * Translates a Prisma error into an AppError, or returns null when the
 * error is not a Prisma error (or is a Prisma error we have no mapping
 * for — those are treated as internal failures and never leak details).
 */
export function mapPrismaError(error: unknown): AppError | null {
  if (!isPrismaError(error)) return null;

  const factory = PRISMA_ERROR_FACTORIES[(error as { code: string }).code];
  return factory ? factory() : null;
}

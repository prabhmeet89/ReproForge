import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// DATABASE_URL lives in .env — load it here too, so this module works even
// when it is imported without the rest of the config layer.
dotenv.config();

const g = globalThis as any;
export const db = g.prisma || new PrismaClient();

if (process.env.NODE_ENV != "production") g.prisma = db;

process.on("SIGTERM", () => db.$disconnect().then(() => process.exit(0)));
process.on("SIGINT", () => db.$disconnect().then(() => process.exit(0)));

/**
 * Prisma hands back DateTime columns as JS Date objects, but the API contract
 * (and the React client types) expect ISO-8601 strings. Every repository maps
 * its rows through this helper so the wire format stays stable.
 */
export function toIsoString(value: Date): string {
  return value.toISOString();
}

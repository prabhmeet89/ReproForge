import { z } from "zod";
import dotenv from "dotenv";

// .env file se variables load karo
dotenv.config();

// Zod schema — yeh define karta hai ki kaunse env vars chahiye aur kya format hona chahiye
const envSchema = z.object({
  PORT: z
    .string()
    .default("3001")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  // Prisma datasource URL — a SQLite file path for local development.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("file:./dev.db"),

  // --- Demo seed (development only) ---
  // The account the demo dataset belongs to. The seed refuses to run
  // without both of these, and refuses to run at all in production.
  DEMO_EMAIL: z.string().trim().email("DEMO_EMAIL must be a valid email address").optional(),

  DEMO_PASSWORD: z.string().min(10, "DEMO_PASSWORD must be at least 10 characters").optional(),

  // --- Authentication (Step 2B) ---

  // Name of the cookie that carries the session token.
  SESSION_COOKIE_NAME: z.string().min(1).default("reproforge_session"),

  // How long a session stays valid, in days.
  SESSION_TTL_DAYS: z
    .string()
    .default("7")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  // Rate limiting for the login/signup endpoints.
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  AUTH_RATE_LIMIT_WINDOW_MINUTES: z
    .string()
    .default("15")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

// Validate karo — agar koi variable missing ya galat hai toh clear error message dega
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Server band karo — invalid config pe chalana dangerous hai
}

export const env = parsed.data;

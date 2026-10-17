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
});

// Validate karo — agar koi variable missing ya galat hai toh clear error message dega
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Server band karo — invalid config pe chalana dangerous hai
}

export const env = parsed.data;

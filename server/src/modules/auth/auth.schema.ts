import { z } from "zod";

/**
 * Email is trimmed and lower-cased before it is stored, so "User@Example.COM "
 * and "user@example.com" can never become two different accounts.
 */
const email = z
  .string({ message: "email is required" })
  .trim()
  .toLowerCase()
  .min(1, "email cannot be empty")
  .email("email must be a valid email address")
  .max(254, "email cannot exceed 254 characters");

export const signupSchema = z
  .object({
    email,
    password: z
      .string({ message: "password is required" })
      .min(10, "password must be at least 10 characters")
      .max(128, "password cannot exceed 128 characters"),
  })
  .strict()
  .superRefine((data, ctx) => {
    // The password must not be the email itself — a trivial credential.
    if (data.password === data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "password must not equal the email",
      });
    }
  });

export const loginSchema = z
  .object({
    email,
    // Login only has to accept what was already stored, so the signup length
    // rules do not apply here.
    password: z
      .string({ message: "password is required" })
      .min(1, "password cannot be empty")
      .max(128, "password cannot exceed 128 characters"),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

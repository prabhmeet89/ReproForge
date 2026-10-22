import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Check, Shield } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { signupFormSchema } from "../lib/schemas";
import type { SignupFormData } from "../lib/schemas";
import { useSignup } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/auth/AuthLayout";
import { PasswordField } from "../components/auth/PasswordField";
import { cn } from "../lib/utils";

function evaluatePasswordStrength(password: string): {
  score: number;
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string;
} {
  if (!password) {
    return { score: 0, label: "Weak", color: "bg-gray-800" };
  }

  let points = 0;
  if (password.length >= 10) points++;
  if (password.length >= 14) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) points++;

  switch (points) {
    case 0:
    case 1:
      return { score: 1, label: "Weak", color: "bg-rose-500" };
    case 2:
      return { score: 2, label: "Fair", color: "bg-amber-500" };
    case 3:
      return { score: 3, label: "Good", color: "bg-teal-400" };
    case 4:
    default:
      return { score: 4, label: "Strong", color: "bg-emerald-400" };
  }
}

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signup = useSignup();
  const shouldReduceMotion = useReducedMotion();

  const [shakeCount, setShakeCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const passwordValue = watch("password") || "";
  const passwordStrength = evaluatePasswordStrength(passwordValue);

  const emailRegistration = register("email");
  const passwordRegistration = register("password");

  const triggerErrorShakeAndFocus = (field?: "email" | "password") => {
    setShakeCount((c) => c + 1);
    setTimeout(() => {
      if (field === "email" && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (field === "password" && passwordInputRef.current) {
        passwordInputRef.current.focus();
      } else if (formTopRef.current) {
        formTopRef.current.focus();
      }
    }, 50);
  };

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signup.mutateAsync(data);
      setIsSuccess(true);

      const returnTo = searchParams.get("returnTo");
      const target = returnTo && returnTo.startsWith("/") ? returnTo : "/app";

      setTimeout(() => {
        navigate(target, { replace: true });
      }, 400);
    } catch (err) {
      setIsSuccess(false);

      if (err instanceof ApiError && err.errors && err.errors.length > 0) {
        err.errors.forEach((fieldError) => {
          setError(fieldError.field as keyof SignupFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
        const firstField = err.errors[0]?.field as "email" | "password";
        triggerErrorShakeAndFocus(firstField);
      } else if (err instanceof ApiError && err.status === 409) {
        setError("email", {
          type: "server",
          message: err.message || "An account with this email already exists",
        });
        triggerErrorShakeAndFocus("email");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("root", {
          message: "Too many registration attempts. Please wait a moment and try again.",
        });
        triggerErrorShakeAndFocus();
      } else {
        setError("root", {
          message:
            err instanceof Error
              ? err.message
              : "Unable to create your account. Please try again.",
        });
        triggerErrorShakeAndFocus();
      }
    }
  };

  const onInvalidSubmit = (fieldErrors: typeof errors) => {
    const firstInvalid = fieldErrors.email ? "email" : fieldErrors.password ? "password" : undefined;
    triggerErrorShakeAndFocus(firstInvalid);
  };

  return (
    <motion.div
      animate={
        !shouldReduceMotion && shakeCount > 0
          ? { x: [0, -7, 7, -5, 5, -2, 2, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.32, ease: "easeInOut" }}
      className="w-full rounded-[32px] border border-white/[0.08] bg-[#0A0E18]/60 backdrop-blur-xl p-7 sm:p-9 shadow-2xl shadow-black/80 space-y-6"
    >
      <div ref={formTopRef} tabIndex={-1} className="outline-none space-y-1.5">
        <h2 className="font-display font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 tracking-tight">
          Create your account
        </h2>
        <p className="text-xs text-gray-400">
          Start reproducing bugs in isolated containers in minutes
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormError message={errors.root?.message} />

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@domain.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...emailRegistration}
          ref={(e) => {
            emailRegistration.ref(e);
            emailInputRef.current = e;
          }}
        />

        <div className="space-y-2">
          <PasswordField
            id="password"
            label="Password"
            placeholder="At least 10 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...passwordRegistration}
            ref={(e) => {
              passwordRegistration.ref(e);
              passwordInputRef.current = e;
            }}
          />

          {/* Password Strength Meter */}
          {passwordValue.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Strength:</span>
                <span
                  data-testid="strength-label"
                  className={cn(
                    "font-medium",
                    passwordStrength.score <= 1
                      ? "text-rose-400"
                      : passwordStrength.score === 2
                      ? "text-amber-400"
                      : "text-emerald-400"
                  )}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      "h-1 rounded-full transition-all duration-200",
                      step <= passwordStrength.score
                        ? passwordStrength.color
                        : "bg-gray-800"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-500 leading-snug flex items-center gap-1.5 pt-0.5">
            <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              Requires at least 10 characters. Passwords are securely hashed with Argon2id.
            </span>
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2 font-semibold tracking-wide transition-all duration-200"
          isLoading={isSubmitting || signup.isPending}
          disabled={isSuccess}
        >
          {isSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-gray-950 font-bold">
              <Check className="w-4 h-4" />
              Account Created
            </span>
          ) : isSubmitting || signup.isPending ? (
            "Creating account..."
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="pt-2 border-t border-gray-800/60 text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link
          to={withReturnTo("/login", searchParams.get("returnTo"))}
          className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}

function withReturnTo(path: string, returnTo: string | null) {
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

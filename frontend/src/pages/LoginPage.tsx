import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { loginFormSchema } from "../lib/schemas";
import type { LoginFormData } from "../lib/schemas";
import { useLogin } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { FormError } from "../components/auth/AuthLayout";
import { PasswordField } from "../components/auth/PasswordField";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
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
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

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

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data);
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
          setError(fieldError.field as keyof LoginFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
        const firstField = err.errors[0]?.field as "email" | "password";
        triggerErrorShakeAndFocus(firstField);
      } else if (err instanceof ApiError && err.status === 429) {
        setError("root", {
          message: "Too many sign in attempts. Please wait a moment and try again.",
        });
        triggerErrorShakeAndFocus();
      } else {
        setError("root", {
          message:
            err instanceof Error
              ? err.message
              : "Invalid email or password. Please check your credentials.",
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
          Welcome back
        </h2>
        <p className="text-xs text-gray-400">
          Sign in to your ReproForge developer console
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

        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...passwordRegistration}
          ref={(e) => {
            passwordRegistration.ref(e);
            passwordInputRef.current = e;
          }}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2 font-semibold tracking-wide transition-all duration-200"
          isLoading={isSubmitting || login.isPending}
          disabled={isSuccess}
        >
          {isSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-gray-950 font-bold">
              <Check className="w-4 h-4" />
              Authenticated
            </span>
          ) : isSubmitting || login.isPending ? (
            "Signing in..."
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="pt-2 border-t border-gray-800/60 text-center text-xs text-gray-400">
        New to ReproForge?{" "}
        <Link
          to={withReturnTo("/signup", searchParams.get("returnTo"))}
          className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          Create an account
        </Link>
      </div>
    </motion.div>
  );
}

function withReturnTo(path: string, returnTo: string | null) {
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

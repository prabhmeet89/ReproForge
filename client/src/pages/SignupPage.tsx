import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupFormSchema } from "../lib/schemas";
import type { SignupFormData } from "../lib/schemas";
import { useSignup } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { AuthLayout, FormError } from "../components/auth/AuthLayout";
import { PasswordField } from "../components/auth/PasswordField";

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signup.mutateAsync(data);

      const returnTo = searchParams.get("returnTo");
      const target = returnTo && returnTo.startsWith("/") ? returnTo : "/app";
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        err.errors.forEach((fieldError) => {
          setError(fieldError.field as keyof SignupFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
      } else if (err instanceof ApiError && err.status === 409) {
        // A duplicate email comes back as a plain 409 with no field
        // list, so the message is attached to the email field by hand.
        setError("email", {
          type: "server",
          message: err.message || "An account with this email already exists",
        });
      } else {
        setError("root", {
          message:
            err instanceof Error
              ? err.message
              : "Unable to create the account. Please try again.",
        });
      }
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start reproducing bugs in minutes"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={withReturnTo("/login", searchParams.get("returnTo"))}
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-md p-6 shadow-xl"
        noValidate
      >
        <FormError message={errors.root?.message} />

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          id="password"
          label="Password"
          placeholder="At least 10 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <p className="text-[11px] text-gray-500 leading-snug">
          Use at least 10 characters. Your password is hashed with argon2id
          before it is stored — the plaintext is never saved.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || signup.isPending}
        >
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Carries `returnTo` across to the login page. */
function withReturnTo(path: string, returnTo: string | null) {
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

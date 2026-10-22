import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginFormSchema } from "../lib/schemas";
import type { LoginFormData } from "../lib/schemas";
import { useLogin } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { AuthLayout, FormError } from "../components/auth/AuthLayout";
import { PasswordField } from "../components/auth/PasswordField";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data);

      // Send the user back to where they were headed before they hit the
      // login wall. Only same-site paths are honoured, so `returnTo`
      // cannot be used to bounce someone to another site.
      const returnTo = searchParams.get("returnTo");
      const target = returnTo && returnTo.startsWith("/") ? returnTo : "/app";
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        err.errors.forEach((fieldError) => {
          setError(fieldError.field as keyof LoginFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
      } else {
        // The server answers a bad password with one message for both an
        // unknown email and a wrong password, so it goes on the form.
        setError("root", {
          message:
            err instanceof Error
              ? err.message
              : "Unable to sign in. Please try again.",
        });
      }
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your developer console"
      footer={
        <>
          New to ReproForge?{" "}
          <Link
            to={withReturnTo("/signup", searchParams.get("returnTo"))}
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Create an account
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
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || login.isPending}
        >
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Carries `returnTo` across to the signup page. */
function withReturnTo(path: string, returnTo: string | null) {
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

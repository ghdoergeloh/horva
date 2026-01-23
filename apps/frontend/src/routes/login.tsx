import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Form } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { JollyTextField } from "@/components/ui/textfield";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (session) {
    void navigate({ to: "/dashboard" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp.email({
          email,
          password,
          name,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed");
          return;
        }
      } else {
        const result = await signIn.email({
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed");
          return;
        }
      }
      void navigate({ to: "/dashboard" });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isSignUp
              ? "Sign up to get started"
              : "Sign in to your account to continue"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <Form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <JollyTextField
                label="Name"
                name="name"
                type="text"
                value={name}
                onChange={setName}
                isRequired
                autoComplete="name"
              />
            )}

            <JollyTextField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired
              autoComplete="email"
            />

            <JollyTextField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              isRequired
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <Checkbox>Remember me</Checkbox>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isDisabled={isLoading}
            >
              {isLoading
                ? "Loading..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="font-medium text-primary hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

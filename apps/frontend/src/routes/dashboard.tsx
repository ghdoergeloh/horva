import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/rpc-client";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = useSession();

  const { data: helloData, isPending: isHelloPending } = useQuery(
    orpc.user.hello.queryOptions()
  );

  if (isSessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    void navigate({ to: "/login" });
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <Button variant="outline" size="sm" onPress={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-5xl font-bold text-foreground">
            {isHelloPending ? "Loading..." : helloData?.message}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Welcome to your dashboard, {session.user.name ?? "User"}!
          </p>
        </div>
      </main>
    </div>
  );
}

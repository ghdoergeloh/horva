import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "~/lib/auth";
import { orpc } from "~/lib/orpc";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: Index,
});

function Index() {
  const hello = useQuery(orpc.user.hello.queryOptions());

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <p className="text-muted-foreground">
        {hello.data?.message ?? (hello.isError ? "API not reachable" : "…")}
      </p>
    </div>
  );
}

import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Button } from "@repo/ui/Button";

import { authClient } from "~/lib/auth";

const RootLayout = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex gap-2">
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>{" "}
          <Link to="/about" className="[&.active]:font-bold">
            About
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? null : session?.user ? (
            <>
              <span className="text-sm">{session.user.email}</span>
              <Button
                variant="secondary"
                onPress={async () => {
                  await authClient.signOut();
                  await navigate({ to: "/login" });
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">Sign In</Link>
          )}
        </div>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });

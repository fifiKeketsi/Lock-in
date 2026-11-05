import { useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { syncShieldExtension } from "@/lib/app-blocking";

function RootComponent(): React.JSX.Element {
  useEffect(() => {
    syncShieldExtension();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-20 md:pb-0">
      <Outlet />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

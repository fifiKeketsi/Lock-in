import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: (): React.JSX.Element => (
    <div className="min-h-screen bg-background text-foreground antialiased pb-20 md:pb-0">
      <Outlet />
    </div>
  ),
});

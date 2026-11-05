import { useEffect } from "react";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { clearActiveFocusSession, syncShieldExtension } from "@/lib/app-blocking";

function RootComponent(): React.JSX.Element {
  const location = useLocation();

  useEffect(() => {
    const p = location.pathname || "";
    const isFocusOrRoomPage = p === "/focus" || (p.startsWith("/rooms/") && p !== "/rooms/");
    if (!isFocusOrRoomPage) {
      clearActiveFocusSession();
    } else {
      syncShieldExtension();
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-20 md:pb-0">
      <Outlet />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

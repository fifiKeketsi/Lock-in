import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Flame, Sparkles, LayoutDashboard, Clock, Brain, Heart, BarChart3, Users, Sun, Moon, LogOut } from "lucide-react";
import { useLockIn } from "@/lib/store";
import type { Theme } from "@/lib/store";

export function AppNav() {
  const { state, setTheme, logout } = useLockIn();
  const navigate = useNavigate();

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(state.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg focus-gradient text-primary-foreground">
            <Lock className="size-4.5" />
          </div>
          <span>Lock-In</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" icon={<LayoutDashboard className="size-4" />}>Dashboard</NavLink>
          <NavLink to="/focus" icon={<Clock className="size-4" />}>Focus</NavLink>
          <NavLink to="/warmup" icon={<Brain className="size-4" />}>Warm-up</NavLink>
          <NavLink to="/checkin" icon={<Heart className="size-4" />}>Check-in</NavLink>
          <NavLink to="/reports" icon={<BarChart3 className="size-4" />}>Reports</NavLink>
          <NavLink to="/rooms" icon={<Users className="size-4" />}>Rooms</NavLink>
        </nav>

        {/* Stats, Theme Toggle & Auth */}
        <div className="flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="flex items-center justify-center rounded-full bg-secondary p-2 hover:bg-secondary/80 transition-colors"
            aria-label="Toggle theme"
            title={`Current theme: ${state.theme}`}
          >
            {state.theme === "light" ? (
              <Sun className="size-4" />
            ) : state.theme === "dark" ? (
              <Moon className="size-4" />
            ) : (
              <div className="flex items-center">
                <Sun className="size-3" />
                <Moon className="size-3 ml-[-4px]" />
              </div>
            )}
          </button>
          {state.user ? (
            <>
              <div className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <Flame className="size-3.5 fill-accent/20" />
                <span>{state.streak}d streak</span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                <span>{state.points} pts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-muted-foreground hidden sm:block">{state.user.name}</div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate({ to: "/" });
                  }}
                  className="flex items-center justify-center rounded-full bg-secondary p-2 hover:bg-secondary/80 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center justify-center rounded-full bg-secondary px-3 py-2 text-sm font-semibold hover:bg-secondary/80 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center rounded-full focus-gradient px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav (Bottom bar for usability) */}
      <div className="md:hidden fixed bottom-0 left-0 z-50 w-full border-t border-border bg-background/95 backdrop-blur px-2 py-1">
        <nav className="flex justify-around items-center">
          <MobileNavLink to="/" icon={<LayoutDashboard className="size-5" />} label="Home" />
          <MobileNavLink to="/focus" icon={<Clock className="size-5" />} label="Focus" />
          <MobileNavLink to="/warmup" icon={<Brain className="size-5" />} label="Warm" />
          <MobileNavLink to="/checkin" icon={<Heart className="size-5" />} label="Reflect" />
          <MobileNavLink to="/reports" icon={<BarChart3 className="size-5" />} label="Stats" />
          <MobileNavLink to="/rooms" icon={<Users className="size-5" />} label="Rooms" />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-secondary text-foreground font-medium" }}
      inactiveProps={{ className: "text-muted-foreground hover:bg-secondary/50 hover:text-foreground" }}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function MobileNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-primary font-medium" }}
      inactiveProps={{ className: "text-muted-foreground" }}
      className="flex flex-col items-center gap-0.5 px-2.5 py-1 text-[10px] transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

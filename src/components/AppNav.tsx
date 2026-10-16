import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Flame, Sparkles, LayoutDashboard, Clock, Brain, Heart, BarChart3, Users, Sun, Moon, LogOut, ArrowRight, X } from "lucide-react";
import { useLockIn } from "@/lib/store";
import type { Theme } from "@/lib/store";

export function AppNav() {
  const { state, setTheme, logout } = useLockIn();
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(state.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="sticky top-0 z-50 w-full transition-all duration-300">
      {/* StudyFetch Signature Top Banner */}
      {!bannerDismissed && (
        <div className="relative w-full bg-[#f5d5ff] dark:bg-[#311e36] text-[#3d0050] dark:text-[#f5d5ff] px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-[#cd8de1]/40 dark:border-[#5c4262]/40 transition-all">
          <div className="mx-auto flex items-center gap-2 text-center truncate">
            <span className="inline-flex items-center gap-1 bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              NEW
            </span>
            <span className="truncate">Lock-In study rooms now feature live WebRTC mesh & concurrent timers!</span>
            <Link
              to="/rooms"
              className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity ml-1"
            >
              Try Rooms <ArrowRight className="size-3" />
            </Link>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="p-1 hover:opacity-60 transition-opacity shrink-0 rounded-full"
            aria-label="Dismiss banner"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Standard Rectangular Navigation Bar */}
      <header className="w-full border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0 whitespace-nowrap">
            <div className="size-9 rounded-xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              <Lock className="size-4.5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
              Lock-In
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <NavLink to="/" icon={<LayoutDashboard className="size-4" />}>Dashboard</NavLink>
            <NavLink to="/focus" icon={<Clock className="size-4" />}>Focus</NavLink>
            <NavLink to="/rooms" icon={<Users className="size-4" />} badge="Live">Rooms</NavLink>
            <NavLink to="/warmup" icon={<Brain className="size-4" />}>Warm-up</NavLink>
            <NavLink to="/checkin" icon={<Heart className="size-4" />}>Reflect</NavLink>
            <NavLink to="/reports" icon={<BarChart3 className="size-4" />}>Reports</NavLink>
          </nav>

          {/* User Status & Action Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              className="size-8.5 rounded-lg border border-border bg-card/60 hover:bg-secondary flex items-center justify-center text-foreground transition-all duration-200 hover:scale-105"
              aria-label="Toggle theme"
              title={`Current theme: ${state.theme}`}
            >
              {state.theme === "light" ? (
                <Sun className="size-3.5" />
              ) : state.theme === "dark" ? (
                <Moon className="size-3.5" />
              ) : (
                <div className="flex items-center">
                  <Sun className="size-2.5" />
                  <Moon className="size-2.5 ml-[-3px]" />
                </div>
              )}
            </button>

            {state.user ? (
              <>
                {/* Streak Badge */}
                <div className="hidden sm:inline-flex sf-badge-lemon items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-[#f9f284] dark:bg-[#2c2612] text-[#604e00] dark:text-[#f9f284] border border-[#ded877] dark:border-[#564d2c]">
                  <Flame className="size-3.5 fill-[#604e00] dark:fill-[#f9f284]" />
                  <span>{state.streak}d streak</span>
                </div>

                {/* Points Badge */}
                <div className="hidden sm:inline-flex sf-badge-pink items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-[#f5d5ff] dark:bg-[#311e36] text-[#3d0050] dark:text-[#f5d5ff] border border-[#cd8de1] dark:border-[#5c4262]">
                  <Sparkles className="size-3.5" />
                  <span>{state.points} pts</span>
                </div>

                {/* User Profile & Sign Out */}
                <div className="flex items-center gap-2 pl-1">
                  <div className="size-8 rounded-full bg-[#eceae0] dark:bg-[#2e2b26] border border-border flex items-center justify-center text-xs font-bold text-foreground">
                    {state.user.name ? state.user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate({ to: "/" });
                    }}
                    className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
                    aria-label="Logout"
                    title="Log out"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="sfb-btn-primary rounded-lg text-xs py-1.5 px-4 font-semibold shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="flex justify-around items-center py-2.5 px-2">
          <MobileNavLink to="/" icon={<LayoutDashboard className="size-4.5" />} label="Home" />
          <MobileNavLink to="/focus" icon={<Clock className="size-4.5" />} label="Focus" />
          <MobileNavLink to="/rooms" icon={<Users className="size-4.5" />} label="Rooms" />
          <MobileNavLink to="/warmup" icon={<Brain className="size-4.5" />} label="Warm" />
          <MobileNavLink to="/checkin" icon={<Heart className="size-4.5" />} label="Reflect" />
          <MobileNavLink to="/reports" icon={<BarChart3 className="size-4.5" />} label="Stats" />
        </div>
      </div>
    </div>
  );
}

function NavLink({
  to,
  icon,
  children,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-foreground text-background font-semibold shadow-sm" }}
      inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-secondary/60" }}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 relative"
    >
      {icon}
      <span>{children}</span>
      {badge && (
        <span className="bg-[#bcf887] text-[#1c2e00] dark:bg-[#1e2b0f] dark:text-[#bcf887] text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ml-0.5">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-foreground font-bold bg-secondary/80" }}
      inactiveProps={{ className: "text-muted-foreground" }}
      className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full text-[10px] transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

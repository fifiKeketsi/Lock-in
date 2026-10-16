import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLockIn } from "@/lib/store";
import { Lock, User, Key, ArrowRight } from "lucide-react";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In · Lock-In" },
      { name: "description", content: "Log in to your Lock-In account to track streaks, study rooms, and focus sessions." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, state } = useLockIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (state.user) {
    navigate({ to: "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate({ to: "/" });
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md sfb-card p-8 md:p-10 shadow-card">
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto size-14 rounded-3xl sfb-badge-lemon flex items-center justify-center text-foreground mb-3">
              <Lock className="size-6" />
            </div>
            <span className="sfb-badge-pink text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Student Workspace
            </span>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
              Log in to sync your focus rooms, study companion, and task streaks.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-[#fee2e2] dark:bg-[#450a0a] border border-[#ef4444]/40 text-[#991b1b] dark:text-[#fecaca] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground pl-1" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <User className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="student@school.edu"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground pl-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Key className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sfb-btn-primary py-3 text-xs font-bold disabled:opacity-60 mt-2 flex items-center justify-center gap-1.5"
            >
              <span>{loading ? "Logging in…" : "Log In to Lock-In"}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground pt-4 border-t border-border">
            Don't have an account yet?{" "}
            <Link to="/register" className="font-bold text-foreground underline hover:opacity-80">
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

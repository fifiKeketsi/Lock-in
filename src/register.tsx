import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLockIn } from "@/lib/store";
import { User, Key, UserPlus, ArrowRight } from "lucide-react";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account · Lock-In" },
      { name: "description", content: "Create a free Lock-In account to raise your virtual study companion and lock in with friends." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register, state } = useLockIn();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (state.user) {
    navigate({ to: "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await register(email, password, name);
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
              <UserPlus className="size-6" />
            </div>
            <span className="sfb-badge-lime text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Free Student Account
            </span>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Get Started</h1>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
              Create your account to unlock focus rooms, AI companion perks, and persistent streak tracking.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-[#fee2e2] dark:bg-[#450a0a] border border-[#ef4444]/40 text-[#991b1b] dark:text-[#fecaca] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground pl-1" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <User className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground pl-1" htmlFor="email">
                Email Address
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
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground pl-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <Key className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sfb-btn-primary py-3 text-xs font-bold disabled:opacity-60 mt-3 flex items-center justify-center gap-1.5"
            >
              <span>{loading ? "Creating your account…" : "Create Free Account"}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground pt-4 border-t border-border">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-foreground underline hover:opacity-80">
              Log in instead
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

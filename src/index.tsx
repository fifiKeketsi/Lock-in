import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Sparkles, Trophy, Flame, Lock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { TaskBoard } from "@/components/TaskBoard";
import { VirtualPet } from "@/components/VirtualPet";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lock-In · Focus app for students" },
      { name: "description", content: "Lock-In helps students beat procrastination with task management, focus timer, social media lock, virtual pet and gamification." },
      { property: "og:title", content: "Lock-In · Focus app for students" },
      { property: "og:description", content: "Beat procrastination with focus sessions, a virtual pet companion and gamified streaks." },
    ],
  }),
  component: Home,
});

const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "Small steps every day beat heroic effort once a week.",
  "Future you is watching. Make them proud.",
  "Focus is a superpower. Train it.",
];

function Home() {
  const { state } = useLockIn();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const completedToday = state.tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen">
      <AppNav />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {!state.user && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Lock className="size-6" />
              </div>
              <div>
                <div className="font-bold text-base">Account Required for Lock-In Activities</div>
                <div className="text-xs opacity-90">
                  Please log in or create an account to start tasks, track focus sessions, log check-ins, build streaks, and join focus rooms. No activity is stored without an account.
                </div>
              </div>
            </div>
            <div className="flex gap-2 text-xs font-semibold shrink-0">
              <Link to="/login" className="px-4 py-2 rounded-xl focus-gradient text-primary-foreground shadow-soft hover:opacity-90">
                Log In
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80">
                Create Account
              </Link>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl focus-gradient p-8 md:p-12 text-primary-foreground">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
        
            </span>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight">
              Stop scrolling.<br />Start locking in.
            </h1>
            <p className="mt-3 text-base md:text-lg text-primary-foreground/80 max-w-lg">
              Manage tasks, run focused Pomodoro sessions, raise your virtual pet and watch your streak grow, all in one calm space.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/focus" className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 font-medium shadow-soft hover:opacity-95 transition">
                Start a focus session
              </Link>
              <Link to="/warmup" className="rounded-lg bg-white/10 backdrop-blur px-5 py-2.5 font-medium hover:bg-white/20 transition">
                Brain warm-up
              </Link>
            </div>
          </div>
        </section>

        {/* Stat row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Flame className="size-4" />} label="Day streak" value={state.streak} accent="bg-accent/15 text-accent-foreground" />
          <StatCard icon={<Sparkles className="size-4" />} label="Points" value={state.points} accent="bg-primary/10 text-primary" />
          <StatCard icon={<Trophy className="size-4" />} label="Badges" value={state.badges.length} accent="bg-success/15 text-success" />
          <StatCard icon={<Lock className="size-4" />} label="Done today" value={completedToday} accent="bg-secondary text-secondary-foreground" />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TaskBoard />

            <div className="card-surface p-5 flex items-start gap-4">
              <div className="size-10 rounded-lg warm-gradient grid place-items-center text-accent-foreground shrink-0">
                <Quote className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Daily nudge</p>
                <p className="mt-1 font-display text-lg leading-snug">"{quote}"</p>
              </div>
            </div>

            {state.badges.length > 0 && (
              <div className="card-surface p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {state.badges.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 rounded-full warm-gradient px-3 py-1 text-sm text-accent-foreground">
                      <Trophy className="size-3.5" /> {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <VirtualPet />

           
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="card-surface p-4">
      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${accent}`}>
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

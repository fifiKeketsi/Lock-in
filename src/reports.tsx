import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, BarChart3 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Study Reports · Lock-In" },
      { name: "description", content: "Weekly study performance, focus consistency, mood trends and productivity analytics." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { state } = useLockIn();

  if (!state.user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md sfb-card p-8 md:p-10 text-center space-y-6">
            <div className="mx-auto size-16 rounded-3xl sfb-badge-teal flex items-center justify-center text-foreground">
              <Lock className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="sfb-badge-lemon text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Account Required
              </span>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Sign In to View Reports
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Log in or create an account to view your weekly focus stats, productivity analytics, and completion trends.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                to="/login"
                className="w-full sfb-btn-primary inline-flex items-center justify-center py-3 text-xs font-semibold"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="w-full sfb-btn-secondary inline-flex items-center justify-center py-3 text-xs font-semibold"
              >
                Create Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const sessionMinByDay = days.map((d) => {
    const k = d.toDateString();
    return state.sessions
      .filter((s) => new Date(s.startedAt).toDateString() === k)
      .reduce((sum, s) => sum + s.durationMin, 0);
  });

  const completedByDay = days.map((d) => {
    const k = d.toDateString();
    return state.tasks.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === k).length;
  });

  const max = Math.max(60, ...sessionMinByDay);
  const totalMin = sessionMinByDay.reduce((a, b) => a + b, 0);
  const totalDone = completedByDay.reduce((a, b) => a + b, 0);
  const avgRating = state.sessions.filter((s) => s.rating).length
    ? (state.sessions.filter((s) => s.rating).reduce((a, s) => a + (s.rating ?? 0), 0) /
       state.sessions.filter((s) => s.rating).length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12 space-y-8">
        <div className="space-y-2">
          <span className="sfb-badge-lime inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="size-3" /> Study Analytics
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Your week in focus.<br />
            <span className="font-editorial italic font-normal text-muted-foreground">Productivity patterns from the last 7 days.</span>
          </h1>
        </div>

        {/* Bento Metric Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric label="Focus minutes" value={`${totalMin}m`} sub={`${(totalMin / 60).toFixed(1)} hrs locked in`} badge="sfb-badge-lemon" />
          <Metric label="Tasks completed" value={String(totalDone)} sub="last 7 days" badge="sfb-badge-lime" />
          <Metric label="Average rating" value={String(avgRating)} sub="out of 5.0" badge="sfb-badge-pink" />
        </div>

        {/* Focus Consistency Bar Chart */}
        <section className="sfb-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Focus Consistency</h2>
              <p className="text-xs text-muted-foreground">Minutes locked in per day</p>
            </div>
            <span className="sfb-badge-teal text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              7-Day Trend
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 h-48 pt-4">
            {days.map((d, i) => {
              const v = sessionMinByDay[i];
              const h = max === 0 ? 0 : (v / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-[#bcf887] dark:bg-[#6aba00] transition-all duration-300 group-hover:opacity-80"
                      style={{ height: `${h}%`, minHeight: v > 0 ? 8 : 4 }}
                      title={`${v} minutes`}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mood Trend & Session Reflections */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="sfb-card p-6 md:p-8 space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Energy & Mood Trend</h2>
            <p className="text-xs text-muted-foreground">Recorded from your morning and evening reflections</p>
            <div className="space-y-3 pt-2">
              {state.moods.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-xs">
                  <div className="w-20 text-[11px] font-semibold text-muted-foreground">{m.date}</div>
                  <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#ffca98] to-[#f9f284] rounded-full" style={{ width: `${(m.energy / 5) * 100}%` }} />
                  </div>
                  <div className="text-[11px] font-bold capitalize w-16 text-right text-foreground">{m.type}</div>
                </div>
              ))}
              {state.moods.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No reflection check-ins recorded yet.</p>
              )}
            </div>
          </div>

          <div className="sfb-card p-6 md:p-8 space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Session Feedback</h2>
            <p className="text-xs text-muted-foreground">Reflections from your completed Pomodoros</p>
            <div className="space-y-3 pt-2">
              {state.sessions.filter((s) => s.feedback).slice(0, 4).map((s) => (
                <div key={s.id} className="rounded-2xl border border-border p-3.5 bg-secondary/20 space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{new Date(s.startedAt).toLocaleDateString()}</span>
                    <span>★ {s.rating} · diff {s.difficulty}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{s.feedback}</p>
                </div>
              ))}
              {state.sessions.filter((s) => s.feedback).length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Complete a focus session to log feedback.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub, badge }: { label: string; value: string; sub: string; badge: string }) {
  return (
    <div className="sfb-card p-6 space-y-3">
      <span className={`${badge} text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block`}>
        {label}
      </span>
      <div className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

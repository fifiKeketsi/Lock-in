import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Weekly reports · Lock-In" },
      { name: "description", content: "Weekly performance, focus consistency, mood trends and distraction logs." },
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
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-soft text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-display text-foreground">
                Account Required for Reports
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Log in or create an account to view your weekly focus stats, productivity analytics, and completion reports.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center py-3 rounded-xl focus-gradient text-primary-foreground font-semibold shadow-soft hover:opacity-90 transition"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition"
              >
                Create an Account
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
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your week in focus</h1>
          <p className="text-muted-foreground">Patterns from the last 7 days.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Metric label="Focus minutes" value={`${totalMin}m`} sub={`${(totalMin / 60).toFixed(1)} hrs total`} />
          <Metric label="Tasks completed" value={String(totalDone)} sub="last 7 days" />
          <Metric label="Avg session rating" value={String(avgRating)} sub="out of 5" />
        </div>

        <section className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold">Focus consistency</h2>
          <p className="text-sm text-muted-foreground">Minutes locked in per day.</p>
          <div className="mt-6 flex items-end justify-between gap-3 h-48">
            {days.map((d, i) => {
              const v = sessionMinByDay[i];
              const h = max === 0 ? 0 : (v / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg focus-gradient transition-all"
                      style={{ height: `${h}%`, minHeight: v > 0 ? 6 : 0 }}
                      title={`${v} min`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">Mood trend</h2>
            <p className="text-sm text-muted-foreground">Energy from your check-ins.</p>
            <div className="mt-4 space-y-2">
              {state.moods.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <div className="w-20 text-xs text-muted-foreground">{m.date}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full warm-gradient" style={{ width: `${(m.energy / 5) * 100}%` }} />
                  </div>
                  <div className="text-xs capitalize w-16 text-right">{m.type}</div>
                </div>
              ))}
              {state.moods.length === 0 && (
                <p className="text-sm text-muted-foreground">No check-ins yet.</p>
              )}
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">Session feedback</h2>
            <p className="text-sm text-muted-foreground">Latest reflections you submitted.</p>
            <ul className="mt-4 space-y-3">
              {state.sessions.filter((s) => s.feedback).slice(0, 4).map((s) => (
                <li key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(s.startedAt).toLocaleDateString()}</span>
                    <span>★ {s.rating} · diff {s.difficulty}</span>
                  </div>
                  <p className="mt-1 text-sm">{s.feedback}</p>
                </li>
              ))}
              {state.sessions.filter((s) => s.feedback).length === 0 && (
                <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-surface p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

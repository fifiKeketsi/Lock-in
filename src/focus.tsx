import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Square, ShieldAlert, Download, Globe, Lock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/focus")({
  validateSearch: (search: Record<string, unknown>): { taskId?: string; blocked?: string } => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    blocked: typeof search.blocked === "string" ? search.blocked : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Focus session · Lock-In" },
      { name: "description", content: "Run a Pomodoro focus session with a social media lock to finish your task." },
    ],
  }),
  component: FocusPage,
});

const BLOCKED = ["instagram.com", "tiktok.com", "x.com", "twitter.com", "facebook.com", "youtube.com"];

function FocusPage() {
  const { taskId, blocked } = Route.useSearch();
  const { state, addSession, completeTask } = useLockIn();
  const task = state.tasks.find((t) => t.id === taskId);

  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(4);
  const [difficulty, setDifficulty] = useState(3);
  const [feedback, setFeedback] = useState("");

  useEffect(() => { setRemaining(duration * 60); }, [duration]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

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
                Account Required for Focus Sessions
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Log in or create an account to start focus timers, log session history, earn points, and level up your virtual pet.
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

  const min = Math.floor(remaining / 60).toString().padStart(2, "0");
  const sec = (remaining % 60).toString().padStart(2, "0");
  const progress = 1 - remaining / (duration * 60);

  function finishSession(submitFeedback: boolean) {
    addSession({
      taskId: task?.id,
      startedAt: new Date().toISOString(),
      durationMin: duration,
      ...(submitFeedback ? { rating, difficulty, feedback } : {}),
    });
    if (task) completeTask(task.id);
    setDone(false);
    setRunning(false);
    setRemaining(duration * 60);
    setFeedback("");
  }

  function downloadExtension() {
    fetch("/lockin-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "lockin-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <ShieldAlert className="size-3" /> Social media lock active
          </span>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
            {task ? task.title : "Free focus session"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {task ? `${task.category} · ${task.priority} priority` : "Pick a task from your list to track it automatically."}
          </p>
        </div>

        {/* Timer ring */}
        <div className="mt-10 grid place-items-center">
          <div className={`relative size-72 rounded-full grid place-items-center focus-gradient text-primary-foreground ${running ? "pulse-ring" : ""}`}>
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
              <circle
                cx="50" cy="50" r="46"
                stroke="oklch(0.85 0.13 70)"
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={(1 - progress) * 2 * Math.PI * 46}
                strokeLinecap="round"
                fill="none"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="text-center">
              <div className="font-display text-6xl font-semibold tabular-nums">{min}:{sec}</div>
              <div className="mt-1 text-xs uppercase tracking-widest opacity-80">{running ? "Locked in" : done ? "Done" : "Ready"}</div>
            </div>
          </div>
        </div>

        {!done && (
          <>
            <div className="mt-6 flex justify-center gap-2">
              {[15, 25, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => { setDuration(m); setRunning(false); }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    duration === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setRunning((r) => !r)}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 font-medium hover:opacity-90"
              >
                {running ? <><Pause className="size-4" /> Pause</> : <><Play className="size-4" /> Start</>}
              </button>
              <button
                onClick={() => { setRunning(false); setRemaining(duration * 60); }}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 hover:bg-secondary/70"
              >
                <Square className="size-4" /> Reset
              </button>
            </div>
          </>
        )}

        {done && (
          <div className="mt-8 card-surface p-6">
            <h2 className="font-display text-xl font-semibold">Session complete 🎉</h2>
            <p className="text-sm text-muted-foreground">Rate this session — feedback shapes your weekly reports.</p>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <Rating label="Productivity" value={rating} onChange={setRating} />
              <Rating label="Difficulty" value={difficulty} onChange={setDifficulty} />
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could improve next time?"
              className="mt-4 w-full min-h-[80px] rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => finishSession(false)}
                className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm"
              >
                Skip feedback
              </button>
              <button
                onClick={() => finishSession(true)}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              >
                Submit & finish
              </button>
            </div>
          </div>
        )}

        {blocked && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm">
            <strong>{blocked}</strong> was blocked by the Lock-In extension. Stay focused — you got this.
          </div>
        )}

        <div className="mt-10 card-surface p-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" /> Blocked during this session
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {BLOCKED.map((b) => (
              <span key={b} className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 text-xs font-mono">
                {b}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This in-app banner is visual only. Install the Lock-In Chrome extension below to actually redirect blocked sites back here.
          </p>
        </div>

        <div className="mt-6 card-surface p-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Globe className="size-4 text-primary" /> Lock-In Browser extension
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enforces the lock by redirecting Instagram, TikTok, X, YouTube, Reddit and more back to Lock-In while a session is running.
          </p>
          <button
            onClick={downloadExtension}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Download className="size-4" /> Download extension (.zip)
          </button>
          <ol className="mt-4 text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li>Unzip the downloaded file.</li>
            <li>Open <span className="font-mono">chrome://extensions</span> in Chrome / Edge / Brave.</li>
            <li>Enable <strong>Developer mode</strong> (top-right toggle).</li>
            <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
            <li>Open the extension popup to start a lock-in session.</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </main>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-md border text-sm font-medium transition ${
              n <= value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

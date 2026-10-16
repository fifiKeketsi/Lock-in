import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Square, ShieldAlert, Download, Globe, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/focus")({
  validateSearch: (search: Record<string, unknown>): { taskId?: string; blocked?: string } => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    blocked: typeof search.blocked === "string" ? search.blocked : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Focus Session · Lock-In" },
      { name: "description", content: "Run a Pomodoro focus session with social media distraction locks to achieve deep work." },
    ],
  }),
  component: FocusPage,
});

const BLOCKED = ["instagram.com", "tiktok.com", "x.com", "twitter.com", "facebook.com", "youtube.com", "reddit.com"];

function FocusPage() {
  const { taskId } = Route.useSearch();
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
          <div className="w-full max-w-md sfb-card p-8 md:p-10 text-center space-y-6">
            <div className="mx-auto size-16 rounded-3xl sfb-badge-lemon flex items-center justify-center text-foreground">
              <Lock className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="sfb-badge-pink text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Authentication Required
              </span>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Sign In to Start Focus
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Log in to link focus sessions with your study tasks, track your weekly metrics, and earn XP for your study companion.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                to="/login"
                className="w-full sfb-btn-primary inline-flex items-center justify-center py-3 text-xs font-semibold"
              >
                Log In to Lock-In
              </Link>
              <Link
                to="/register"
                className="w-full sfb-btn-secondary inline-flex items-center justify-center py-3 text-xs font-semibold"
              >
                Create Free Account
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
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="sfb-badge-lime text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldAlert className="size-3" /> Focus Mode Active
            </span>
            {task && (
              <span className="sfb-badge-lemon text-[11px] font-bold px-3 py-1 rounded-full">
                {task.category}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {task ? task.title : "Deep Work Focus Session"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
            {task ? `Priority: ${task.priority.toUpperCase()} · Stay locked in until the timer chimes.` : "Set your target duration, eliminate browser tabs, and lock in."}
          </p>
        </div>

        {/* StudyFetch Minimalist Circular Timer Card */}
        <div className="sfb-card p-8 md:p-12 text-center space-y-8">
          <div className="grid place-items-center">
            <div className="relative size-68 md:size-80 rounded-full grid place-items-center bg-[#f7f6ef] dark:bg-[#191919] border border-border shadow-inner">
              <svg className="absolute inset-0 -rotate-90 size-full p-2" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2.5" className="text-border" fill="none" />
                <circle
                  cx="50" cy="50" r="45"
                  stroke="#bcf887"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 45}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-linear dark:stroke-[#6aba00]"
                />
              </svg>
              <div className="text-center space-y-1">
                <div className="font-display text-6xl md:text-7xl font-bold tracking-tight text-foreground tabular-nums">
                  {min}:{sec}
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  {running ? (
                    <span className="text-[#16a34a] inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#22c55e] animate-pulse" />
                      Locked In
                    </span>
                  ) : done ? (
                    "Session Finished"
                  ) : (
                    "Ready to Focus"
                  )}
                </div>
              </div>
            </div>
          </div>

          {!done && (
            <div className="space-y-5">
              {/* Duration Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setDuration(m); setRunning(false); }}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      duration === m
                        ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-sm scale-105"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="sfb-btn-primary inline-flex items-center gap-2 text-sm font-bold px-8 py-3"
                >
                  {running ? <><Pause className="size-4" /> Pause Session</> : <><Play className="size-4" /> Start Lock-In</>}
                </button>
                <button
                  onClick={() => { setRunning(false); setRemaining(duration * 60); }}
                  className="sfb-btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-3"
                >
                  <Square className="size-3.5" /> Reset
                </button>
              </div>
            </div>
          )}

          {/* Session Complete Reflection Card */}
          {done && (
            <div className="sfb-card p-6 md:p-8 bg-[#f4ffeb] dark:bg-[#1e2b0f] border border-[#ace37d]/50 dark:border-[#40552a] text-left space-y-4">
              <div className="flex items-center gap-2 text-[#1c2e00] dark:text-[#bcf887]">
                <CheckCircle2 className="size-5" />
                <h2 className="font-display text-lg font-bold">Focus Session Complete! 🎉</h2>
              </div>
              <p className="text-xs text-[#1c2e00]/80 dark:text-[#bcf887]/80">
                You just locked in for {duration} minutes. Rate your session to earn bonus companion XP.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <Rating label="Productivity Score" value={rating} onChange={setRating} />
                <Rating label="Session Difficulty" value={difficulty} onChange={setDifficulty} />
              </div>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What did you get done? Any takeaways?"
                className="w-full min-h-[70px] rounded-2xl border border-border bg-card p-3 text-xs outline-none focus:ring-1 focus:ring-foreground"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => finishSession(false)}
                  className="sfb-btn-secondary text-xs py-2 px-4"
                >
                  Skip Feedback
                </button>
                <button
                  onClick={() => finishSession(true)}
                  className="sfb-btn-primary text-xs py-2 px-5 font-bold"
                >
                  Submit & Log Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Blocked URLs Card */}
        <div className="sfb-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-[#f98538]" /> Protected Distraction Shield
            </h3>
            <span className="sfb-badge-lemon text-[10px] font-bold px-2 py-0.5 rounded-full">
              {BLOCKED.length} Apps
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            While locking in, these common dopamine traps should be closed to maintain flow state:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {BLOCKED.map((b) => (
              <span
                key={b}
                className="rounded-full bg-secondary border border-border px-3 py-1 text-[11px] font-medium text-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Browser Extension Download Card */}
        <div className="sfb-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-foreground" />
              <h3 className="font-display text-base font-bold text-foreground">Lock-In Chrome Extension</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforces hard locks on browser distractions by automatically redirecting YouTube, TikTok, and Instagram back to your focus session.
            </p>
          </div>
          <button
            onClick={downloadExtension}
            className="sfb-btn-primary shrink-0 flex items-center gap-2 text-xs py-2.5 px-5"
          >
            <Download className="size-3.5" />
            <span>Download .zip</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3.5" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold text-foreground">{label}</div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-full border text-xs font-bold transition-all ${
              n <= value
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] border-transparent"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Pause,
  Play,
  Square,
  Globe,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Coffee,
  Sparkles,
  Smartphone,
  Download,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";
import { HardBlockSelector } from "@/components/HardBlockSelector";
import { ProcrastinationNudgeModal } from "@/components/ProcrastinationNudgeModal";
import {
  getSavedBlockedDomains,
  saveBlockedDomains,
  buildExtensionZip,
} from "@/lib/app-blocking";
import { playAlertNudge, playBreakChime, playStartChime } from "@/lib/sound";

export const Route = createFileRoute("/focus")({
  validateSearch: (search: Record<string, unknown>): { taskId?: string; blocked?: string } => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    blocked: typeof search.blocked === "string" ? search.blocked : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Hard App Distraction Lock & Focus · Lock-In" },
      {
        name: "description",
        content:
          "Enforce strict study-to-break ratios, hard app distraction locks, and active anti-procrastination nudges to achieve uninterrupted flow state.",
      },
    ],
  }),
  component: FocusPage,
});

export type TimerPhase = "study" | "break";

export interface RatioPreset {
  id: string;
  label: string;
  studyMin: number;
  breakMin: number;
  badge: string;
}

const RATIO_PRESETS: RatioPreset[] = [
  { id: "pomo", label: "25m Study · 5m Break", studyMin: 25, breakMin: 5, badge: "Classic Pomodoro (5:1)" },
  { id: "deep", label: "50m Study · 10m Break", studyMin: 50, breakMin: 10, badge: "Deep Work (5:1)" },
  { id: "ultradian", label: "90m Study · 15m Break", studyMin: 90, breakMin: 15, badge: "Ultradian Flow (6:1)" },
];

function FocusPage() {
  const { taskId, blocked: blockedQuery } = Route.useSearch();
  const { state, addSession, completeTask } = useLockIn();
  const navigate = useNavigate();
  const task = state.tasks.find((t) => t.id === taskId);

  // Study-to-Break Ratio State
  const [studyDuration, setStudyDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [phase, setPhase] = useState<TimerPhase>("study");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  // Blocked Apps State
  const [blockedDomains, setBlockedDomains] = useState<string[]>(() => {
    const list = getSavedBlockedDomains();
    if (blockedQuery && !list.includes(blockedQuery)) {
      return [...list, blockedQuery];
    }
    return list;
  });

  // Active Procrastination Nudge State
  const [nudgesTriggered, setNudgesTriggered] = useState(0);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [nudgeReason, setNudgeReason] = useState<"blur" | "motion" | "mouse" | "exit">("blur");
  const hasTriggeredNudgeInCycle = useRef(false);

  // Feedback State
  const [rating, setRating] = useState(4);
  const [difficulty, setDifficulty] = useState(3);
  const [feedback, setFeedback] = useState("");

  // Sync remaining when duration changes (only if stopped)
  useEffect(() => {
    if (!running) {
      setRemaining(phase === "study" ? studyDuration * 60 : breakDuration * 60);
    }
  }, [studyDuration, breakDuration, phase, running]);

  // Main countdown timer with Strict Study-to-Break transition
  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (phase === "study") {
            // Strict Study Block Fulfilled! Transition immediately to Break and unlock apps.
            playBreakChime();
            setPhase("break");
            return breakDuration * 60;
          } else {
            // Break timer expired! Conclude session or prompt next cycle.
            playStartChime();
            setRunning(false);
            setDone(true);
            setPhase("study");
            return studyDuration * 60;
          }
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, phase, studyDuration, breakDuration]);

  // Active Procrastination Nudge Detection (Only triggers during active study phase)
  useEffect(() => {
    if (!running || phase !== "study") return;

    // Request notification permission once session starts
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const triggerNudge = (reason: "blur" | "motion" | "mouse" | "exit") => {
      if (hasTriggeredNudgeInCycle.current) return;
      hasTriggeredNudgeInCycle.current = true;
      setNudgesTriggered((n) => n + 1);
      setNudgeReason(reason);
      setShowNudgeModal(true);
      playAlertNudge();

      // Trigger desktop notification if supported
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("⚠️ PUT YOUR DEVICE DOWN!", {
            body: "Your Lock-In focus timer is actively running! Return to your desk immediately.",
            icon: "/favicon.svg",
            requireInteraction: true,
          });
        } catch {}
      }

      // Reset throttle after 8 seconds
      setTimeout(() => {
        hasTriggeredNudgeInCycle.current = false;
      }, 8000);
    };

    // 1. Tab switch or window minimization
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerNudge("exit");
      }
    };

    // 2. Window focus lost
    const handleBlur = () => {
      triggerNudge("blur");
    };

    // 3. Mouse leaving towards browser address bar/tab list
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) {
        triggerNudge("mouse");
      }
    };

    // 4. Mobile physical device motion/pickup detection
    let initialBeta: number | null = null;
    let initialGamma: number | null = null;

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (initialBeta === null || initialGamma === null) {
        initialBeta = e.beta;
        initialGamma = e.gamma;
        return;
      }
      const deltaBeta = Math.abs(e.beta - initialBeta);
      const deltaGamma = Math.abs(e.gamma - initialGamma);
      // If phone tilts more than 35 degrees (picked up from desk)
      if (deltaBeta > 35 || deltaGamma > 35) {
        triggerNudge("motion");
        initialBeta = e.beta;
        initialGamma = e.gamma;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("deviceorientation", handleDeviceOrientation);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, [running, phase]);

  const handleToggleRunning = () => {
    if (!state.user) {
      navigate({ to: "/login" });
      return;
    }
    if (!running) {
      playStartChime();
    }
    setRunning((r) => !r);
  };

  const handleSelectPreset = (p: RatioPreset) => {
    if (!state.user) {
      navigate({ to: "/login" });
      return;
    }
    setStudyDuration(p.studyMin);
    setBreakDuration(p.breakMin);
    setPhase("study");
    setRunning(false);
    setRemaining(p.studyMin * 60);
  };

  const handleReset = () => {
    if (!state.user) {
      navigate({ to: "/login" });
      return;
    }
    setRunning(false);
    setPhase("study");
    setRemaining(studyDuration * 60);
  };

  const handleBlockedDomainsChange = (newDomains: string[]) => {
    setBlockedDomains(newDomains);
    saveBlockedDomains(newDomains);
  };

  const handleDownloadExtension = () => {
    if (!state.user) {
      navigate({ to: "/login" });
      return;
    }
    const blob = buildExtensionZip(blockedDomains);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lockin-extension.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function finishSession(submitFeedback: boolean) {
    if (!state.user) {
      navigate({ to: "/login" });
      return;
    }
    addSession({
      taskId: task?.id,
      startedAt: new Date().toISOString(),
      durationMin: studyDuration,
      ...(submitFeedback ? { rating, difficulty, feedback } : {}),
    });
    if (task) completeTask(task.id);
    setDone(false);
    setRunning(false);
    setPhase("study");
    setRemaining(studyDuration * 60);
    setFeedback("");
    setNudgesTriggered(0);
  }

  const currentTotalDuration = phase === "study" ? studyDuration * 60 : breakDuration * 60;
  const progress = 1 - remaining / currentTotalDuration;
  const min = Math.floor(remaining / 60).toString().padStart(2, "0");
  const sec = (remaining % 60).toString().padStart(2, "0");

  const isHardBlockActive = running && phase === "study";

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Active Procrastination Nudge Modal Alert */}
      <ProcrastinationNudgeModal
        isOpen={showNudgeModal}
        onDismiss={() => setShowNudgeModal(false)}
        reason={nudgeReason}
        timeRemainingFormatted={`${min}:${sec}`}
        blockedCount={blockedDomains.length}
        nudgeCount={nudgesTriggered}
      />

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2">
            {task && (
              <span className="sfb-badge-lemon text-[11px] font-bold px-3 py-1 rounded-full">
                {task.category}
              </span>
            )}
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 ${
                phase === "study"
                  ? isHardBlockActive
                    ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                    : "sfb-badge-lime"
                  : "bg-sky-500/15 text-sky-500 border border-sky-500/30"
              }`}
            >
              {phase === "study" ? (
                <>
                  <ShieldAlert className="size-3" />
                  {isHardBlockActive ? "Hard App Block Armed" : "Deep Work Phase"}
                </>
              ) : (
                <>
                  <Coffee className="size-3" />
                  Official Break · Apps Unlocked
                </>
              )}
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {task ? task.title : phase === "study" ? "Deep Work Focus Session" : "Official Rest Break"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
            {phase === "study"
              ? "Distracting apps are strictly locked until you complete this study block. If you leave or pick up your phone, active nudges will trigger."
              : `Your study block is fulfilled! Distracting apps are temporarily unlocked for the next ${breakDuration} minutes.`}
          </p>
        </div>

        {/* Study-to-Break Ratio Configuration Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sfb-card">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="size-3.5 text-[#f98538]" /> Study-to-Break Ratio
            </div>
            <div className="text-[11px] text-muted-foreground">
              Ratio enforces strict work completion before granting phone & app access
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center">
            {RATIO_PRESETS.map((p) => {
              const isSelected = studyDuration === p.studyMin && breakDuration === p.breakMin;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  disabled={running}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-sm scale-102"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  } ${running ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Circular Timer Card */}
        <div className="sfb-card p-8 md:p-12 text-center space-y-8">
          <div className="grid place-items-center">
            <div className="relative size-68 md:size-80 rounded-full grid place-items-center bg-[#f7f6ef] dark:bg-[#191919] border border-border shadow-inner">
              <svg className="absolute inset-0 -rotate-90 size-full p-2" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2.5" className="text-border" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke={phase === "study" ? (isHardBlockActive ? "#ef4444" : "#bcf887") : "#38bdf8"}
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 45}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="text-center space-y-1">
                <div className="font-display text-6xl md:text-7xl font-bold tracking-tight text-foreground tabular-nums">
                  {min}:{sec}
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  {running ? (
                    phase === "study" ? (
                      <span className="text-[#ef4444] inline-flex items-center gap-1.5 font-bold">
                        <span className="size-2 rounded-full bg-[#ef4444] animate-ping" />
                        Hard Lock Active ({blockedDomains.length} Apps)
                      </span>
                    ) : (
                      <span className="text-sky-500 inline-flex items-center gap-1.5 font-bold">
                        <Coffee className="size-3 animate-bounce" />
                        Break Active · Apps Unlocked
                      </span>
                    )
                  ) : done ? (
                    "Session Finished"
                  ) : (
                    "Ready to Lock In"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleToggleRunning}
              className={`inline-flex items-center gap-2 text-sm font-bold px-8 py-3 rounded-full transition-all shadow-md ${
                isHardBlockActive
                  ? "bg-[#191919] hover:bg-black text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919]"
                  : "sfb-btn-primary"
              }`}
            >
              {running ? (
                <>
                  <Pause className="size-4" /> Pause Session
                </>
              ) : (
                <>
                  <Play className="size-4" /> Start {phase === "study" ? "Deep Work Block" : "Break"}
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="sfb-btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-3"
            >
              <Square className="size-3.5" /> Reset
            </button>
          </div>

          {/* Active Procrastination Counter Callout */}
          {running && phase === "study" && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground pt-1">
              <Smartphone className="size-3.5 text-[#f97316]" />
              <span>Anti-Procrastination Shield Active:</span>
              <span className="text-foreground font-bold">
                {nudgesTriggered === 0 ? "0 Nudges Triggered" : `${nudgesTriggered} Pickups / Tab Exits Nudged`}
              </span>
            </div>
          )}

          {/* Feedback Card on Completion */}
          {done && (
            <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-[#16a34a] font-bold text-sm">
                <CheckCircle2 className="size-5" />
                <span>Deep Work Cycle Complete! How was your focus?</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Rating label="Focus Quality" value={rating} onChange={setRating} />
                <Rating label="Task Difficulty" value={difficulty} onChange={setDifficulty} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Session Reflection</label>
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you conquer during this lock-in block?"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => finishSession(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Skip
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

        {/* Hard App Blocking Component */}
        <HardBlockSelector
          blockedDomains={blockedDomains}
          onChange={handleBlockedDomainsChange}
          isLocked={isHardBlockActive}
          onDownloadExtension={handleDownloadExtension}
        />

        {/* Browser Extension Download Card */}
        <div className="sfb-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-foreground" />
              <h3 className="font-display text-base font-bold text-foreground">
                Lock-In Chrome / Edge Extension
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforces OS and browser-level hard blocking by automatically redirecting blocked platforms (
              {blockedDomains.slice(0, 3).join(", ")}) directly back to your focus session until your break begins.
            </p>
          </div>
          <button
            onClick={handleDownloadExtension}
            className="sfb-btn-primary shrink-0 flex items-center gap-2 text-xs py-2.5 px-5 font-bold cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Download .zip Extension</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
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

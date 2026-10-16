import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Sunrise, Moon, Lock, ArrowLeft, Check } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Daily Reflection · Lock-In" },
      { name: "description", content: "Morning and evening mood and energy check-ins to track cognitive patterns." },
    ],
  }),
  component: CheckinPage,
});

const EMOJIS = [
  { emoji: "😴", label: "Drained" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "🙂", label: "Focused" },
  { emoji: "😄", label: "Energetic" },
  { emoji: "🚀", label: "Locked In" },
];

function CheckinPage() {
  const { state, addMood } = useLockIn();
  const hour = new Date().getHours();
  const defaultType: "morning" | "evening" = hour < 16 ? "morning" : "evening";
  const [type, setType] = useState<"morning" | "evening">(defaultType);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (!state.user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md sfb-card p-8 md:p-10 text-center space-y-6">
            <div className="mx-auto size-16 rounded-3xl sfb-badge-peach flex items-center justify-center text-foreground">
              <Lock className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="sfb-badge-pink text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Account Required
              </span>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Sign In to Log Reflections
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Log in or create an account to record your energy levels, mood check-ins, and study insights over time.
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addMood({ type, energy, note, date: new Date().toISOString().slice(0, 10) });
    setSaved(true);
    setNote("");
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8 md:py-12 space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="sfb-badge-peach inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Heart className="size-3" /> Daily Reflection
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            How is your focus energy?<br />
            <span className="font-editorial italic font-normal text-muted-foreground">Check in with your mind.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Tracking your cognitive energy helps Lock-In optimize your Pomodoro session lengths throughout the week.
          </p>
        </div>

        <form onSubmit={submit} className="sfb-card p-6 md:p-8 space-y-6">
          {/* Morning / Evening Toggle Pills */}
          <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-full">
            {(["morning", "evening"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold capitalize transition-all ${
                  type === t
                    ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "morning" ? <Sunrise className="size-4 text-[#f59e0b]" /> : <Moon className="size-4 text-[#6366f1]" />}
                <span>{t} Check-in</span>
              </button>
            ))}
          </div>

          {/* Energy Rating Emoticons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Energy & Motivation Level</span>
              <span className="text-muted-foreground font-normal">{EMOJIS[energy - 1].label}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {EMOJIS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEnergy(i + 1)}
                  className={`h-16 rounded-2xl border flex flex-col items-center justify-center text-2xl transition-all duration-200 ${
                    energy === i + 1
                      ? "border-foreground bg-card scale-105 shadow-md"
                      : "border-border bg-card/60 hover:border-foreground/30 hover:scale-102"
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Personal Reflection Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "morning" ? "What is the single most important task to crush today?" : "What went well today? What can we improve tomorrow?"}
              className="w-full min-h-[90px] rounded-2xl border border-border bg-card p-3.5 text-xs md:text-sm outline-none focus:ring-1 focus:ring-foreground leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="text-xs font-bold text-[#16a34a] flex items-center gap-1.5">
                <Check className="size-4" /> Reflection Saved!
              </span>
            ) : <div />}
            <button
              type="submit"
              className="sfb-btn-primary text-xs py-2.5 px-6 font-bold"
            >
              Save Reflection
            </button>
          </div>
        </form>

        {/* History Bento Card */}
        {state.moods.length > 0 && (
          <div className="sfb-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-foreground">Recent Reflections</h2>
              <span className="text-xs text-muted-foreground">{state.moods.length} logged</span>
            </div>
            <ul className="space-y-2.5">
              {state.moods.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center gap-3.5 p-3 rounded-2xl bg-secondary/30 border border-border/50 text-xs">
                  <span className="text-2xl leading-none">{EMOJIS[(m.energy || 3) - 1]?.emoji || "🙂"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground capitalize flex items-center gap-1.5">
                      <span>{m.type}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">· {m.date}</span>
                    </div>
                    {m.note && <div className="text-muted-foreground truncate mt-0.5">{m.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center pt-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3.5" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

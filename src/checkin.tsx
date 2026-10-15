import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Sunrise, Moon, Lock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Daily check-in · Lock-In" },
      { name: "description", content: "Morning and evening mood and energy check-ins to surface your patterns over time." },
    ],
  }),
  component: CheckinPage,
});

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
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-soft text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-display text-foreground">
                Account Required for Daily Check-In
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Log in or create an account to record your energy levels, mood check-ins, and reflection notes over time.
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addMood({ type, energy, note, date: new Date().toISOString().slice(0, 10) });
    setSaved(true);
    setNote("");
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          <Heart className="size-3" /> Reflection
        </span>
        <h1 className="mt-3 font-display text-3xl font-semibold">How are you feeling?</h1>
        <p className="mt-2 text-muted-foreground">Tracking energy patterns helps Lock-In suggest the right time to focus.</p>

        <form onSubmit={submit} className="mt-6 card-surface p-6 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(["morning", "evening"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`inline-flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium capitalize transition ${
                  type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t === "morning" ? <Sunrise className="size-4" /> : <Moon className="size-4" />} {t}
              </button>
            ))}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Energy level</div>
            <div className="flex gap-2">
              {["sad", "meh", "happy", "excited", "amazed"].map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEnergy(i + 1)}
                  className={`flex-1 h-14 rounded-lg border text-2xl transition ${
                    energy === i + 1 ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === "morning" ? "What's one thing you'll focus on today?" : "What went well today?"}
            className="w-full min-h-[100px] rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="flex items-center justify-between">
            {saved && <span className="text-sm text-success">Saved ✓</span>}
            <button className="ml-auto rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium">
              Save check-in
            </button>
          </div>
        </form>

        {state.moods.length > 0 && (
          <div className="mt-8 card-surface p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Recent check-ins</h2>
            <ul className="space-y-2">
              {state.moods.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{["😴", "😐", "🙂", "😄", "🚀"][m.energy - 1]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium capitalize">{m.type} · {m.date}</div>
                    {m.note && <div className="text-muted-foreground truncate">{m.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </div>
      </main>
    </div>
  );
}

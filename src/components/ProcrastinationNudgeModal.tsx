import { useEffect } from "react";
import { AlertTriangle, Smartphone, ArrowRight, ShieldAlert } from "lucide-react";
import { playAlertNudge } from "@/lib/sound";

interface ProcrastinationNudgeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  reason: "blur" | "motion" | "mouse" | "exit" | "blocked";
  blockedDomain?: string | null;
  timeRemainingFormatted: string;
  blockedCount: number;
  nudgeCount: number;
}

const NUDGE_QUOTES = [
  "Put the phone down. The temporary scroll will cost you your long-term dream.",
  "You are stronger than a dopamine trap designed by an algorithm. Return to work.",
  "Your future self is watching this exact moment. Make them proud.",
  "Every time you resist picking up your phone, your focus stamina doubles.",
  "Deep work is rare and valuable. Protect your attention at all costs.",
];

export function ProcrastinationNudgeModal({
  isOpen,
  onDismiss,
  reason,
  blockedDomain,
  timeRemainingFormatted,
  blockedCount,
  nudgeCount,
}: ProcrastinationNudgeModalProps) {
  useEffect(() => {
    if (isOpen) {
      playAlertNudge();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 300]);
        } catch {}
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quote = NUDGE_QUOTES[(nudgeCount - 1) % NUDGE_QUOTES.length] || NUDGE_QUOTES[0];

  const reasonText =
    reason === "blocked"
      ? `Restricted app blocked${blockedDomain ? ` (${blockedDomain})` : ""}! Returned you to your active focus timer.`
      : reason === "motion"
      ? "Physical phone pickup detected! Device was lifted during active focus."
      : reason === "mouse"
      ? "Attempted to leave focus screen towards other apps or browser tabs."
      : "You switched away or minimized your study timer screen.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg sfb-card border-2 border-[#ef4444] bg-[#121214] text-white p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Pulsing Alert Icon */}
        <div className="mx-auto relative size-20 rounded-3xl bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444]">
          <span className="absolute inset-0 rounded-3xl bg-[#ef4444]/20 animate-ping" />
          {reason === "motion" ? (
            <Smartphone className="size-10 relative stroke-[2.5]" />
          ) : (
            <AlertTriangle className="size-10 relative stroke-[2.5]" />
          )}
        </div>

        {/* Warning Headlines */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#ef4444] text-white shadow-xs">
            <ShieldAlert className="size-3" /> Active Procrastination Nudge #{nudgeCount}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Put Down Your Device!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-sm mx-auto leading-relaxed">
            {reasonText}
          </p>
        </div>

        {/* Accountability Box */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2.5">
            <span className="text-zinc-400 font-semibold">Strict Deep-Work Block:</span>
            <span className="font-display font-bold text-[#f97316] text-sm tabular-nums">
              {timeRemainingFormatted} remaining
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-semibold">Distraction Shield Status:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {blockedCount} Apps Locked
            </span>
          </div>
          <div className="pt-2 text-xs italic text-zinc-300 border-t border-zinc-800 leading-relaxed font-editorial">
            "{quote}"
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#ef4444]/25 flex items-center justify-center gap-2 hover:scale-102 active:scale-98 cursor-pointer"
          >
            <span>I'm Back & Locking In</span>
            <ArrowRight className="size-4" />
          </button>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
            Distracting platforms will automatically unlock once the break timer starts.
          </p>
        </div>
      </div>
    </div>
  );
}

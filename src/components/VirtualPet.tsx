import { useState } from "react";
import { Smile, Heart, Award, Edit2, Check, Sparkles, MessageSquare } from "lucide-react";
import { useLockIn } from "@/lib/store";

export function VirtualPet() {
  const { state, renamePet } = useLockIn();
  const [editing, setEditing] = useState(false);
  const [petName, setPetName] = useState(state.pet.name);
  const [wiggle, setWiggle] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [speechBubble, setSpeechBubble] = useState("Let's lock in and crush our study goals today! 🚀");

  const xpProgress = state.pet.xp % 100;

  const handleRename = () => {
    if (petName.trim()) {
      renamePet(petName.trim());
      setEditing(false);
    }
  };

  const handleInteract = () => {
    setWiggle(true);
    setShowHeart(true);
    const phrases = [
      "I believe in you! Keep going! ⭐",
      "One 25-minute Pomodoro at a time! 🎯",
      "Purr... your focus streak is looking incredible! 🔥",
      "Drink some water and let's get back to studying! 💧",
      "You're making future you proud right now! 📚",
    ];
    setSpeechBubble(phrases[Math.floor(Math.random() * phrases.length)]);
    setTimeout(() => setWiggle(false), 500);
    setTimeout(() => setShowHeart(false), 1200);
  };

  const getPetVisual = () => {
    if (state.pet.happiness >= 80) {
      return { emoji: "🦊", status: "Thrilled", color: "text-[#16a34a]" };
    } else if (state.pet.happiness >= 50) {
      return { emoji: "🐱", status: "Happy & Focused", color: "text-[#2563eb]" };
    } else {
      return { emoji: "🥺", status: "Needs study time", color: "text-[#d97706]" };
    }
  };

  const pet = getPetVisual();

  return (
    <div className="sfb-card p-6 space-y-4 text-left relative overflow-hidden">
      {/* Floating Heart Effect */}
      {showHeart && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 -translate-y-4 animate-ping text-[#dc2626] text-2xl z-20 pointer-events-none">
          ❤️
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="sfb-badge-pink text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="size-2.5" /> Companion
          </span>
          <h2 className="font-display text-base font-bold text-foreground">Sparky Buddy</h2>
        </div>
        <div className="sfb-badge-lemon flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full">
          <Award className="size-3" />
          <span>Lvl {state.pet.level}</span>
        </div>
      </div>

      {/* Mascot Speech Bubble */}
      <div className="relative bg-[#fff5ec] dark:bg-[#391f0c] border border-[#ffaa6b]/40 dark:border-[#6a4225] rounded-2xl p-3 text-xs text-[#4a1d00] dark:text-[#ffca98] flex items-start gap-2 shadow-sm">
        <MessageSquare className="size-3.5 shrink-0 mt-0.5 text-[#f98538]" />
        <span className="font-medium leading-relaxed">{speechBubble}</span>
      </div>

      <div className="flex items-center gap-4 pt-1">
        {/* Pet Avatar Squircle */}
        <button
          onClick={handleInteract}
          className={`size-20 rounded-3xl bg-gradient-to-br from-[#f5d5ff] via-[#ffca98] to-[#f9f284] dark:from-[#311e36] dark:via-[#391f0c] dark:to-[#2c2612] border border-[#cd8de1]/40 dark:border-[#5c4262] flex items-center justify-center text-4xl shadow-sm shrink-0 cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${
            wiggle ? "animate-bounce" : ""
          }`}
          title="Click to interact with your study buddy!"
          aria-label="Interact with pet"
        >
          {pet.emoji}
        </button>

        {/* Pet Stats */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value.slice(0, 14))}
                  className="h-8 border border-border rounded-full px-3 text-xs bg-card w-full focus:outline-none focus:ring-1 focus:ring-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  aria-label="Pet name input"
                  autoFocus
                />
                <button
                  onClick={handleRename}
                  className="size-7 rounded-full bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] flex items-center justify-center shrink-0"
                  aria-label="Confirm rename"
                >
                  <Check className="size-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="font-display font-bold text-base text-foreground truncate">{state.pet.name}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Rename pet"
                  title="Rename"
                >
                  <Edit2 className="size-3" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smile className="size-3.5 text-muted-foreground" />
            <span>Mood: <strong className={pet.color}>{pet.status}</strong></span>
          </div>

          {/* Happiness Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="size-3 text-[#dc2626] fill-[#dc2626]" /> Happiness
              </span>
              <span>{state.pet.happiness}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f87171] to-[#ef4444] rounded-full transition-all duration-500"
                style={{ width: `${state.pet.happiness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Experience Level Progress */}
      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>XP to Next Level</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-[#bcf887] dark:bg-[#6aba00] rounded-full transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Complete tasks & sessions to earn XP
          </p>
          <button
            onClick={handleInteract}
            className="text-[11px] font-semibold text-foreground underline hover:opacity-75"
          >
            Pet Buddy 👋
          </button>
        </div>
      </div>
    </div>
  );
}

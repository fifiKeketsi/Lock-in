import { useState } from "react";
import { Smile, Heart, Award, Edit2, Check } from "lucide-react";
import { useLockIn } from "@/lib/store";

export function VirtualPet() {
  const { state, renamePet } = useLockIn();
  const [editing, setEditing] = useState(false);
  const [petName, setPetName] = useState(state.pet.name);
  const [wiggle, setWiggle] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

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
    setTimeout(() => setWiggle(false), 500);
    setTimeout(() => setShowHeart(false), 1200);
  };

  // Get pet emoji/status based on happiness
  const getPetVisual = () => {
    if (state.pet.happiness >= 80) {
      return { emoji: "🐱", status: "Thrilled", color: "text-amber-500" };
    } else if (state.pet.happiness >= 50) {
      return { emoji: "🐱", status: "Happy", color: "text-primary" };
    } else {
      return { emoji: "😿", status: "Needs focus sessions", color: "text-muted-foreground" };
    }
  };

  const pet = getPetVisual();

  return (
    <div className="card-surface p-5 space-y-4 text-left relative overflow-hidden">
      {/* Visual heart bubble on interaction */}
      {showHeart && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 -translate-y-4 animate-ping text-destructive text-2xl z-20">
          ❤️
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Your Focus Buddy</h2>
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
          <Award className="size-3.5 text-accent" />
          <span>Lvl {state.pet.level}</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Pet Avatar */}
        <button
          onClick={handleInteract}
          className={`size-20 rounded-2xl warm-gradient flex items-center justify-center text-4xl shadow-soft shrink-0 border border-accent/20 cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${
            wiggle ? "animate-bounce" : ""
          }`}
          title="Click to interact!"
          aria-label="Interact with pet"
        >
          {pet.emoji}
        </button>

        {/* Pet Stats & Info */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value.slice(0, 12))}
                  className="h-8 border border-input rounded px-2 text-sm bg-background w-full focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  aria-label="Pet name input"
                />
                <button onClick={handleRename} className="p-1 text-success hover:bg-secondary rounded" aria-label="Confirm rename">
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="font-display font-bold text-lg text-foreground truncate">{state.pet.name}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Rename pet"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smile className="size-3.5 text-primary" />
            <span>Mood: <strong className={pet.color}>{pet.status}</strong></span>
          </div>

          {/* Happiness Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-0.5"><Heart className="size-3 text-destructive fill-destructive" /> Happiness</span>
              <span>{state.pet.happiness}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive transition-all duration-500"
                style={{ width: `${state.pet.happiness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Experience Level Progress */}
      <div className="space-y-1.5 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Level Progress</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full focus-gradient transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Earn XP by completing tasks and locking in for focus sessions!
        </p>
      </div>
    </div>
  );
}

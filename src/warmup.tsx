import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RotateCcw, WholeWord, Check, Trophy, Delete, Grid3x3, Circle, Lock, Shuffle, CheckCircle2, Sparkles, Play, Navigation, Lightbulb } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/warmup")({
  head: () => ({
    meta: [
      { title: "Brain warm-up · Lock-In" },
      { name: "description", content: "Quick cognitive warm-up games to shift your brain from passive scrolling to active focus." },
    ],
  }),
  component: WarmupPage,
});

type GameId = "wordle" | "numpuz" | "arrowpuzzle" | "connectdots";

const GAMES: { id: GameId; name: string; tag: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "wordle", name: "Wordle", tag: "~60s", icon: WholeWord, desc: "Unscramble words to reveal circled clues." },
  { id: "numpuz", name: "NumPuz", tag: "~60s", icon: Grid3x3, desc: "Slide tiles in order from 1 to 8." },
  { id: "arrowpuzzle", name: "Arrow Puzzle Challenge", tag: "~45s", icon: Navigation, desc: "Tap arrows in sequence to escape the maze." },
  { id: "connectdots", name: "Connect Dots: Puzzle Challenge", tag: "~45s", icon: Circle, desc: "Connect dots without crossing paths." },
];

function WarmupPage() {
  const { state } = useLockIn();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameId>("wordle");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-6">
        <div className="text-center space-y-2.5">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Prime your brain.<br />
            <span className="font-editorial italic font-normal text-muted-foreground">Fast cognitive games to enter flow state.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Pick a 30-second cognitive mini-game to shift your neural circuits from passive doom-scrolling into active study focus.
          </p>
        </div>

        {/* Game Switcher Bento Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GAMES.map((g) => {
            const Icon = g.icon;
            const active = game === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGame(g.id)}
                className={`rounded-2xl p-4 text-left transition-all duration-200 border flex flex-col justify-between ${
                  active
                    ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] border-transparent shadow-md scale-[1.02]"
                    : "sfb-card hover:border-black/20 dark:hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="size-4 shrink-0" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      active ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "sfb-badge-lemon"
                    }`}>
                      {g.tag}
                    </span>
                  </div>
                  <div className="font-bold text-sm leading-snug line-clamp-2">{g.name}</div>
                </div>
                <div className={`text-[11px] mt-2 truncate ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {g.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="sfb-card p-6 md:p-8 relative overflow-hidden">
          {!state.user && (
            <div
              onClick={() => navigate({ to: "/login" })}
              className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all"
            >
              <div className="size-12 rounded-2xl sfb-badge-lemon flex items-center justify-center text-foreground mb-3 shadow-sm">
                <Lock className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-1">
                Log In to Play
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Sign in to play cognitive warm-up games, solve daily puzzles, and track your records.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: "/login" });
                }}
                className="sfb-btn-primary text-xs py-2.5 px-6 font-bold shadow-sm"
              >
                Log In to Lock-In
              </button>
            </div>
          )}

          {game === "wordle" && <WordleGame />}
          {game === "numpuz" && <NumPuzGame />}
          {game === "arrowpuzzle" && <ArrowPuzzleGame />}
          {game === "connectdots" && <ColorConnectGame />}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
          <Link to="/focus" className="sfb-btn-primary text-xs py-2.5 px-5 font-bold">
            Start Focus Session →
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ---------------- Wordle (Jumble Anagram Challenge) ---------------- */

interface JumbleWord {
  scramble: string;
  target: string;
  validAnswers?: string[];
  circles: number[]; // 0-based indices of square boxes with inscribed circles
}

interface JumblePuzzle {
  id: string;
  name: string;
  words: JumbleWord[];
  bonusWord?: string;
  bonusHint?: string;
}

const JUMBLE_PUZZLES: JumblePuzzle[] = [
  {
    id: "puzzle-1",
    name: "Classic Wordle Anagrams",
    words: [
      {
        scramble: "MSAET",
        target: "STEAM",
        validAnswers: ["STEAM", "TEAMS", "MATES", "MEATS", "TAMES"],
        circles: [2], // 'E'
      },
      {
        scramble: "UGFNL",
        target: "FLUNG",
        validAnswers: ["FLUNG"],
        circles: [3, 4], // 'N', 'G'
      },
      {
        scramble: "KQIYUR",
        target: "QUIRKY",
        validAnswers: ["QUIRKY"],
        circles: [2, 3], // 'I', 'R'
      },
      {
        scramble: "RNWARO",
        target: "NARROW",
        validAnswers: ["NARROW"],
        circles: [0, 4], // 'N', 'O'
      },
    ],
    bonusWord: "IGNORER",
    bonusHint: "Circled letters revealed: E, N, G, I, R, N, O",
  },
  {
    id: "puzzle-2",
    name: "Growth & Focus",
    words: [
      {
        scramble: "LPTAN",
        target: "PLANT",
        validAnswers: ["PLANT"],
        circles: [1],
      },
      {
        scramble: "FCSOU",
        target: "FOCUS",
        validAnswers: ["FOCUS"],
        circles: [2, 4],
      },
      {
        scramble: "GHTLI",
        target: "LIGHT",
        validAnswers: ["LIGHT"],
        circles: [1, 3],
      },
      {
        scramble: "WNRDOE",
        target: "WONDER",
        validAnswers: ["WONDER"],
        circles: [1, 4],
      },
    ],
    bonusWord: "GROWTH",
    bonusHint: "Cultivate deep attention",
  },
  {
    id: "puzzle-3",
    name: "Energy & Spark",
    words: [
      {
        scramble: "FSEHR",
        target: "FRESH",
        validAnswers: ["FRESH"],
        circles: [0, 3],
      },
      {
        scramble: "BOCLK",
        target: "BLOCK",
        validAnswers: ["BLOCK"],
        circles: [2],
      },
      {
        scramble: "KSRAP",
        target: "SPARK",
        validAnswers: ["SPARK"],
        circles: [1, 4],
      },
      {
        scramble: "CLVREE",
        target: "CLEVER",
        validAnswers: ["CLEVER"],
        circles: [0, 4],
      },
    ],
    bonusWord: "SPARKLE",
    bonusHint: "Ignite mental clarity",
  },
  {
    id: "puzzle-4",
    name: "Mind & Momentum",
    words: [
      {
        scramble: "RBAIN",
        target: "BRAIN",
        validAnswers: ["BRAIN"],
        circles: [0, 2],
      },
      {
        scramble: "QKCIU",
        target: "QUICK",
        validAnswers: ["QUICK"],
        circles: [3],
      },
      {
        scramble: "STRAM",
        target: "SMART",
        validAnswers: ["SMART"],
        circles: [1, 4],
      },
      {
        scramble: "ACTNOI",
        target: "ACTION",
        validAnswers: ["ACTION"],
        circles: [2, 5],
      },
    ],
    bonusWord: "ACTION",
    bonusHint: "Execution beats contemplation",
  },
  {
    id: "puzzle-5",
    name: "Flow & Precision",
    words: [
      {
        scramble: "CIGLO",
        target: "LOGIC",
        validAnswers: ["LOGIC"],
        circles: [1, 3],
      },
      {
        scramble: "SHPAR",
        target: "SHARP",
        validAnswers: ["SHARP"],
        circles: [2],
      },
      {
        scramble: "ALRTE",
        target: "ALERT",
        validAnswers: ["ALERT", "ALTER", "LATER"],
        circles: [0, 4],
      },
      {
        scramble: "STREMA",
        target: "STREAM",
        validAnswers: ["STREAM", "MASTER", "TAMERS"],
        circles: [1, 5],
      },
    ],
    bonusWord: "CLARITY",
    bonusHint: "Clear vision and sharp thinking",
  },
];

function WordleGame() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = JUMBLE_PUZZLES[puzzleIdx];

  // Each word has an array of entered characters
  const [guesses, setGuesses] = useState<string[][]>(() =>
    puzzle.words.map((w) => Array(w.target.length).fill(""))
  );
  const [solved, setSolved] = useState<boolean[]>(() =>
    puzzle.words.map(() => false)
  );
  const [activeRow, setActiveRow] = useState<number>(0);
  const [activeCol, setActiveCol] = useState<number>(0);

  // Scrambled banners (can be rearranged/re-shuffled)
  const [bannerScrambles, setBannerScrambles] = useState<string[]>(() =>
    puzzle.words.map((w) => w.scramble)
  );

  const [phase, setPhase] = useState<"playing" | "completed">("playing");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [best, setBest] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);

  // Load best time from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.wordle.best");
    if (raw) setBest(Number(raw));
  }, []);

  // Timer effect
  useEffect(() => {
    if (phase !== "playing" || startTime === null) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, startTime]);

  // When switching puzzles, reset state
  function loadPuzzle(idx: number) {
    const nextPuzzle = JUMBLE_PUZZLES[idx];
    setPuzzleIdx(idx);
    setGuesses(nextPuzzle.words.map((w) => Array(w.target.length).fill("")));
    setSolved(nextPuzzle.words.map(() => false));
    setBannerScrambles(nextPuzzle.words.map((w) => w.scramble));
    setActiveRow(0);
    setActiveCol(0);
    setPhase("playing");
    setStartTime(null);
    setElapsed(0);
    setShakeRow(null);
  }

  // Shuffle the letter order in the banners
  function handleRearrange() {
    setBannerScrambles((prev) =>
      prev.map((s) => {
        const arr = s.split("");
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join("");
      })
    );
  }

  // Next puzzle
  function handleNextPuzzle() {
    const nextIdx = (puzzleIdx + 1) % JUMBLE_PUZZLES.length;
    loadPuzzle(nextIdx);
  }

  // Reset current puzzle
  function handleReset() {
    loadPuzzle(puzzleIdx);
  }

  // Validate a row's guess
  function checkRow(rIdx: number, currentGuesses: string[][]) {
    const wordConfig = puzzle.words[rIdx];
    const entered = currentGuesses[rIdx].join("").toUpperCase();

    // Check against target or valid anagrams
    const isExact = entered === wordConfig.target;
    const isAlternative = wordConfig.validAnswers && wordConfig.validAnswers.includes(entered);
    const isSortedMatch =
      entered.length === wordConfig.target.length &&
      entered.split("").sort().join("") === wordConfig.target.split("").sort().join("");

    if (isExact || isAlternative || isSortedMatch) {
      // Mark as solved
      setSolved((prev) => {
        const next = [...prev];
        next[rIdx] = true;

        // Check if all rows are now solved
        const allDone = next.every(Boolean);
        if (allDone) {
          setPhase("completed");
          const totalElapsed = startTime ? Date.now() - startTime : elapsed;
          if (!best || totalElapsed < best) {
            setBest(totalElapsed);
            localStorage.setItem("lockin.warmup.wordle.best", String(totalElapsed));
          }
        }
        return next;
      });

      // Move cursor to next unsolved row
      setTimeout(() => {
        setSolved((latestSolved) => {
          const nextUnsolved = latestSolved.findIndex((s, idx) => idx > rIdx && !s);
          const wrapUnsolved = latestSolved.findIndex((s) => !s);
          if (nextUnsolved !== -1) {
            setActiveRow(nextUnsolved);
            setActiveCol(0);
          } else if (wrapUnsolved !== -1) {
            setActiveRow(wrapUnsolved);
            setActiveCol(0);
          }
          return latestSolved;
        });
      }, 150);
    } else {
      // Shake row on incorrect complete word
      setShakeRow(rIdx);
      setTimeout(() => setShakeRow(null), 500);
    }
  }

  // Insert a letter into active box
  function insertLetter(char: string) {
    if (phase === "completed" || solved[activeRow]) return;
    if (startTime === null) setStartTime(Date.now());

    const upper = char.toUpperCase();
    const wordLen = puzzle.words[activeRow].target.length;

    setGuesses((prev) => {
      const next = prev.map((row) => [...row]);
      next[activeRow][activeCol] = upper;

      // If this fill completes the row, validate it
      const isRowFull = next[activeRow].every((c) => c !== "");
      if (isRowFull) {
        checkRow(activeRow, next);
      }

      return next;
    });

    // Advance cursor to next column if available
    setActiveCol((prevCol) => (prevCol < wordLen - 1 ? prevCol + 1 : prevCol));
  }

  // Backspace handler
  function handleBackspace() {
    if (phase === "completed" || solved[activeRow]) return;

    setGuesses((prev) => {
      const next = prev.map((row) => [...row]);
      if (next[activeRow][activeCol] !== "") {
        next[activeRow][activeCol] = "";
      } else if (activeCol > 0) {
        next[activeRow][activeCol - 1] = "";
        setActiveCol(activeCol - 1);
      }
      return next;
    });
  }

  // Clear current row
  function handleClearRow() {
    if (phase === "completed" || solved[activeRow]) return;
    setGuesses((prev) => {
      const next = prev.map((row, idx) =>
        idx === activeRow ? Array(puzzle.words[activeRow].target.length).fill("") : [...row]
      );
      return next;
    });
    setActiveCol(0);
  }

  // Hint: fills in one correct letter
  function handleHint() {
    if (phase === "completed" || solved[activeRow]) return;
    const target = puzzle.words[activeRow].target;
    const currentRow = guesses[activeRow];

    // Find first incorrect or empty index
    let hintIdx = -1;
    for (let i = 0; i < target.length; i++) {
      if (currentRow[i] !== target[i]) {
        hintIdx = i;
        break;
      }
    }
    if (hintIdx !== -1) {
      if (startTime === null) setStartTime(Date.now());
      setGuesses((prev) => {
        const next = prev.map((row) => [...row]);
        next[activeRow][hintIdx] = target[hintIdx];
        if (next[activeRow].every((c) => c !== "")) {
          checkRow(activeRow, next);
        }
        return next;
      });
      setActiveCol(Math.min(hintIdx + 1, target.length - 1));
    }
  }

  // Physical keyboard listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (/^[a-zA-Z]$/.test(e.key)) {
        insertLetter(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveCol((c) => Math.max(0, c - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const maxLen = puzzle.words[activeRow].target.length;
        setActiveCol((c) => Math.min(maxLen - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveRow((r) => Math.max(0, r - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveRow((r) => Math.min(puzzle.words.length - 1, r + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        checkRow(activeRow, guesses);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRow, activeCol, phase, solved, guesses, puzzle, startTime]);

  // Compute remaining unused letters for active row to show in quick-tile bar
  const activeBannerStr = bannerScrambles[activeRow];
  const activeRowGuesses = guesses[activeRow];

  // Map letters in banner that are already typed in this row
  const bannerLettersWithStatus = useMemo(() => {
    const letters = activeBannerStr.split("");
    const usedCounts: Record<string, number> = {};
    activeRowGuesses.forEach((c) => {
      if (c) usedCounts[c] = (usedCounts[c] || 0) + 1;
    });

    const countsSeen: Record<string, number> = {};
    return letters.map((char, index) => {
      countsSeen[char] = (countsSeen[char] || 0) + 1;
      const isUsed = countsSeen[char] <= (usedCounts[char] || 0);
      return { char, index, isUsed };
    });
  }, [activeBannerStr, activeRowGuesses]);

  // Collect all circled clue letters from all 4 words
  const circledItems = useMemo(() => {
    return puzzle.words.flatMap((word, rIdx) => {
      return word.circles.map((cIdx) => {
        const isRevealed = solved[rIdx];
        const letter = isRevealed ? word.target[cIdx] : guesses[rIdx][cIdx] || "";
        return {
          rIdx,
          cIdx,
          targetLetter: word.target[cIdx],
          letter,
          isRevealed,
        };
      });
    });
  }, [puzzle, solved, guesses]);

  const solvedCount = solved.filter(Boolean).length;
  const revealedCirclesCount = circledItems.filter((c) => c.isRevealed).length;

  return (
    <div className="space-y-6">
      {/* Game Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground tracking-tight">
              Wordle Jumble
            </h2>
            <span className="sfb-badge-pink text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {puzzle.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Unscramble each row to reveal the circled mystery clue letters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRearrange}
            className="sfb-btn-outline text-xs py-2 px-3 flex items-center gap-1.5 font-semibold text-foreground hover:bg-secondary transition-colors"
            title="Rearrange scramble letters"
          >
            <Shuffle className="size-3.5 text-indigo-500" />
            Rearrange
          </button>
          <button
            onClick={handleHint}
            disabled={solved[activeRow] || phase === "completed"}
            className="sfb-btn-outline text-xs py-2 px-3 flex items-center gap-1.5 font-semibold text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
            title="Reveal 1 correct letter in active row"
          >
            <Lightbulb className="size-3.5 text-amber-500" />
            Hint
          </button>
          <button
            onClick={handleReset}
            className="sfb-btn-outline text-xs py-2 px-3 flex items-center gap-1.5 font-semibold text-foreground hover:bg-secondary transition-colors"
            title="Reset current puzzle"
          >
            <RotateCcw className="size-3.5 text-rose-500" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Puzzle Card (Faithful to User's Reference Screenshot) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#20184e] p-5 sm:p-7 shadow-2xl border border-indigo-950/60 select-none">
        {/* Decorative Geometric SVG Background matching the screenshot */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full opacity-65"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="jumble-dots-pattern"
              x="0"
              y="0"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="4" cy="4" r="1.4" fill="#baa6e8" opacity="0.4" />
            </pattern>
          </defs>
          {/* Top-right dotted circular grid */}
          <circle cx="88%" cy="16%" r="68" fill="url(#jumble-dots-pattern)" />
          {/* Pink accent disc */}
          <circle cx="68%" cy="22%" r="28" fill="#e2749e" opacity="0.65" />
          {/* Bottom-right overlapping circular patterns */}
          <circle cx="94%" cy="78%" r="75" fill="url(#jumble-dots-pattern)" />
          <circle cx="88%" cy="84%" r="48" fill="#b1598f" opacity="0.45" />
          <circle cx="98%" cy="92%" r="56" fill="#e885aa" opacity="0.4" />
        </svg>

        {/* 4 Stacked Word Cards */}
        <div className="relative z-10 max-w-sm mx-auto space-y-4">
          {puzzle.words.map((wordConfig, rIdx) => {
            const isRowSolved = solved[rIdx];
            const isActiveRow = activeRow === rIdx && !isRowSolved;
            const isShaking = shakeRow === rIdx;
            const bannerStr = bannerScrambles[rIdx];

            return (
              <div
                key={rIdx}
                className={`transition-transform duration-200 ${
                  isShaking ? "animate-bounce" : ""
                } ${
                  isActiveRow
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#20184e] rounded-md shadow-lg"
                    : ""
                }`}
                style={
                  isShaking
                    ? {
                        animation: "shake 0.4s cubic-bezier(.36,.07,.19,.97) both",
                      }
                    : undefined
                }
              >
                {/* Lavender Scrambled Banner */}
                <div
                  className="bg-[#e2e0f5] border border-[#20184e] py-1.5 px-3 flex items-center justify-between shadow-sm cursor-pointer"
                  onClick={() => {
                    setActiveRow(rIdx);
                    // Focus first empty box
                    const emptyIdx = guesses[rIdx].findIndex((c) => c === "");
                    setActiveCol(emptyIdx === -1 ? 0 : emptyIdx);
                  }}
                >
                  <div className="flex-1 flex items-center justify-center gap-3 sm:gap-4">
                    {bannerStr.split("").map((ch, cIndex) => {
                      return (
                        <button
                          key={cIndex}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRow(rIdx);
                            insertLetter(ch);
                          }}
                          className="font-display font-extrabold text-base sm:text-lg tracking-widest text-[#20184e] hover:text-indigo-700 active:scale-95 transition-transform"
                          title={`Add ${ch}`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                  {isRowSolved && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 ml-2">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* White Square Letter Boxes Row */}
                <div className="flex border-x border-b border-[#20184e] bg-white">
                  {Array.from({ length: wordConfig.target.length }).map((_, cIdx) => {
                    const letter = guesses[rIdx][cIdx] || "";
                    const isCircled = wordConfig.circles.includes(cIdx);
                    const isActiveBox = isActiveRow && activeCol === cIdx;

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          setActiveRow(rIdx);
                          setActiveCol(cIdx);
                        }}
                        className={`relative flex-1 aspect-square flex items-center justify-center border-r border-[#20184e] last:border-r-0 transition-colors ${
                          isActiveBox
                            ? "bg-indigo-50/90 ring-2 ring-indigo-600 ring-inset"
                            : isRowSolved
                              ? "bg-emerald-50/30"
                              : "hover:bg-slate-50"
                        }`}
                        style={{ minHeight: "44px" }}
                      >
                        {/* Inscribed Circle (Exact reproduction of reference screenshot) */}
                        {isCircled && (
                          <div
                            className={`absolute inset-1 sm:inset-1.5 rounded-full pointer-events-none transition-all duration-300 ${
                              isRowSolved
                                ? "border-[2px] border-emerald-500 bg-emerald-100/25 shadow-sm"
                                : "border border-neutral-400/90"
                            }`}
                          />
                        )}

                        {/* Letter Text */}
                        <span
                          className={`relative z-10 font-display font-black text-xl sm:text-2xl uppercase ${
                            isRowSolved ? "text-emerald-950 font-bold" : "text-[#20184e]"
                          }`}
                        >
                          {letter}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Circled Clue Letters Rack */}
        <div className="relative z-10 mt-6 max-w-sm mx-auto p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-pink-300 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                Circled Clue Letters
              </span>
            </div>
            <span className="text-[10px] font-semibold text-pink-200">
              {revealedCirclesCount} of {circledItems.length} Revealed
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 py-1">
            {circledItems.map((item, i) => (
              <div
                key={i}
                className={`size-9 sm:size-10 rounded-full flex items-center justify-center font-display font-extrabold text-base sm:text-lg transition-all duration-300 shadow-md ${
                  item.isRevealed
                    ? "bg-gradient-to-br from-pink-400 via-rose-400 to-amber-300 text-slate-950 scale-105 ring-2 ring-pink-300/80 shadow-pink-500/20"
                    : "border-2 border-dashed border-white/30 bg-white/5 text-white/30"
                }`}
              >
                {item.isRevealed ? item.targetLetter : "?"}
              </div>
            ))}
          </div>

          {phase === "completed" && (
            <div className="mt-3 pt-2.5 border-t border-white/10 text-center animate-fade-in">
              <div className="text-xs font-semibold text-pink-200">
                Mystery Revealed: <span className="font-extrabold tracking-widest text-white">{puzzle.bonusWord}</span>
              </div>
              <div className="text-[10px] text-indigo-200/80 mt-0.5">{puzzle.bonusHint}</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Interactive Letter Bar for Active Row (Frictionless Touch & Click) */}
      {!solved[activeRow] && phase === "playing" && (
        <div className="sfb-card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Row <strong className="text-foreground">{activeRow + 1}</strong>: Tap letters to place
            </span>
            <span className="text-[11px]">Type A-Z or use buttons</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {bannerLettersWithStatus.map(({ char, index, isUsed }) => (
              <button
                key={index}
                onClick={() => insertLetter(char)}
                disabled={isUsed}
                className={`size-11 sm:size-12 rounded-xl font-display font-black text-lg transition-all ${
                  isUsed
                    ? "bg-muted text-muted-foreground/40 border border-border/50 scale-95 opacity-50 cursor-not-allowed"
                    : "bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95"
                }`}
              >
                {char}
              </button>
            ))}

            <button
              onClick={handleBackspace}
              className="h-11 sm:h-12 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs flex items-center gap-1 active:scale-95 transition-transform"
              title="Delete letter"
            >
              <Delete className="size-4" />
              ⌫
            </button>

            <button
              onClick={handleClearRow}
              className="h-11 sm:h-12 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-semibold text-xs active:scale-95 transition-transform"
              title="Clear row"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Completion Victory Banner */}
      {phase === "completed" && (
        <div className="sfb-card p-6 md:p-8 text-center space-y-4 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border-emerald-500/30">
          <div className="size-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <Trophy className="size-7 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-display text-foreground">
              Puzzle Completed! Perfect Lock-In!
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You unscrambled all 4 words in {((elapsed || 1) / 1000).toFixed(1)} seconds and collected all circled letters!
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleNextPuzzle}
              className="sfb-btn-primary py-2.5 px-6 font-bold text-xs flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              Next Puzzle Challenge
            </button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Solved" value={`${solvedCount}/4`} />
        <Stat
          label="Time"
          value={
            phase === "completed"
              ? `${(elapsed / 1000).toFixed(1)}s`
              : startTime
                ? `${(elapsed / 1000).toFixed(1)}s`
                : "0.0s"
          }
        />
        <Stat label="Best" value={best ? `${(best / 1000).toFixed(1)}s` : "—"} />
        <Stat label="Puzzle" value={`#${puzzleIdx + 1}`} />
      </div>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}

/* ---------------- NumPuz (Sliding Number Puzzle) ---------------- */

function generateNumpuzBoard(size: number = 3, numMoves: number = 120): number[] {
  const total = size * size;
  // Solved state: [1, 2, ..., total - 1, 0]
  const board = Array.from({ length: total - 1 }, (_, i) => i + 1);
  board.push(0);

  let emptyIdx = total - 1;
  let lastMovedIdx = -1;

  for (let m = 0; m < numMoves; m++) {
    const emptyR = Math.floor(emptyIdx / size);
    const emptyC = emptyIdx % size;

    const neighbors: number[] = [];
    if (emptyR > 0) neighbors.push((emptyR - 1) * size + emptyC);
    if (emptyR < size - 1) neighbors.push((emptyR + 1) * size + emptyC);
    if (emptyC > 0) neighbors.push(emptyR * size + (emptyC - 1));
    if (emptyC < size - 1) neighbors.push(emptyR * size + (emptyC + 1));

    // Avoid immediate backwards oscillation
    const validMoves = neighbors.filter((n) => n !== lastMovedIdx);
    const chosen = validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : neighbors[0];

    board[emptyIdx] = board[chosen];
    board[chosen] = 0;
    lastMovedIdx = emptyIdx;
    emptyIdx = chosen;
  }

  // Ensure it's not solved initially
  const isSolved = board.every((v, i) => (i === total - 1 ? v === 0 : v === i + 1));
  if (isSolved) return generateNumpuzBoard(size, numMoves);

  return board;
}

function NumPuzGame() {
  const [gridSize, setGridSize] = useState<3 | 4>(3);
  const [initialBoard, setInitialBoard] = useState<number[]>(() => generateNumpuzBoard(3));
  const [board, setBoard] = useState<number[]>(() => [...initialBoard]);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`lockin.warmup.numpuz.${gridSize}.best`);
    if (raw) setBest(Number(raw));
    else setBest(null);
  }, [gridSize]);

  // Timer loop
  useEffect(() => {
    if (phase === "running") {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedDisplay(Math.round(performance.now() - startTimeRef.current));
      }, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase]);

  const checkWin = (b: number[], size: number) => {
    const total = size * size;
    return b.every((val, idx) => (idx === total - 1 ? val === 0 : val === idx + 1));
  };

  const handleTileClick = (index: number) => {
    if (phase === "done" || board[index] === 0) return;

    const size = gridSize;
    const emptyIdx = board.indexOf(0);
    const emptyR = Math.floor(emptyIdx / size);
    const emptyC = emptyIdx % size;

    const tapR = Math.floor(index / size);
    const tapC = index % size;

    // Check if tile is in same row or column as empty space
    if (tapR !== emptyR && tapC !== emptyC) return;

    if (phase === "idle") {
      setPhase("running");
      startTimeRef.current = performance.now();
    }

    const nextBoard = [...board];

    if (tapR === emptyR) {
      // Horizontal slide
      const dir = tapC < emptyC ? 1 : -1;
      let c = emptyC;
      while (c !== tapC) {
        const nextC = c - dir;
        nextBoard[emptyR * size + c] = nextBoard[emptyR * size + nextC];
        c = nextC;
      }
      nextBoard[emptyR * size + tapC] = 0;
    } else {
      // Vertical slide
      const dir = tapR < emptyR ? 1 : -1;
      let r = emptyR;
      while (r !== tapR) {
        const nextR = r - dir;
        nextBoard[r * size + emptyC] = nextBoard[nextR * size + emptyC];
        r = nextR;
      }
      nextBoard[tapR * size + emptyC] = 0;
    }

    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setMoves(nextMoves);

    if (checkWin(nextBoard, size)) {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setPhase("done");
      setTime(elapsed);
      if (!best || elapsed < best) {
        setBest(elapsed);
        localStorage.setItem(`lockin.warmup.numpuz.${size}.best`, String(elapsed));
      }
    }
  };

  const startNewGame = (size: 3 | 4 = gridSize) => {
    const newB = generateNumpuzBoard(size);
    setInitialBoard(newB);
    setBoard([...newB]);
    setMoves(0);
    setTime(null);
    setElapsedDisplay(0);
    setPhase("idle");
  };

  const resetCurrentGame = () => {
    setBoard([...initialBoard]);
    setMoves(0);
    if (phase === "done") {
      setPhase("idle");
      setElapsedDisplay(0);
    }
  };

  // Keyboard navigation support (Arrow keys slide tiles into the gap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "done") return;
      const size = gridSize;
      const emptyIdx = board.indexOf(0);
      const emptyR = Math.floor(emptyIdx / size);
      const emptyC = emptyIdx % size;

      let targetIdx = -1;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (emptyR < size - 1) targetIdx = (emptyR + 1) * size + emptyC;
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        if (emptyR > 0) targetIdx = (emptyR - 1) * size + emptyC;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (emptyC < size - 1) targetIdx = emptyR * size + (emptyC + 1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (emptyC > 0) targetIdx = emptyR * size + (emptyC - 1);
      }

      if (targetIdx !== -1) {
        e.preventDefault();
        handleTileClick(targetIdx);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, gridSize, phase]);

  const isTileInCorrectPosition = (val: number, idx: number) => {
    return val !== 0 && val === idx + 1;
  };

  return (
    <div className="space-y-5">
      {/* Top Controls & Grid Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border/50 text-xs font-semibold">
          <button
            onClick={() => {
              setGridSize(3);
              startNewGame(3);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 3
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3×3 Grid (8-Puzzle)
          </button>
          <button
            onClick={() => {
              setGridSize(4);
              startNewGame(4);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 4
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            4×4 Grid (15-Puzzle)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetCurrentGame}
            title="Reset current scrambled board"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl sfb-card hover:bg-secondary/70 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
          <button
            onClick={() => startNewGame(gridSize)}
            title="Generate new scrambled board"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] hover:opacity-90 transition-opacity shadow-sm"
          >
            <Shuffle className="size-3.5" />
            Rearrange
          </button>
        </div>
      </div>

      {/* Main NumPuz Wooden Frame Grid (Matching User Reference Image) */}
      <div className="relative">
        <div className="relative aspect-square max-w-[340px] sm:max-w-[380px] w-full mx-auto select-none rounded-2xl bg-[#8c5a36] dark:bg-[#5a381f] border-4 border-[#6d4323] dark:border-[#422612] shadow-2xl p-2.5 sm:p-3 overflow-hidden">
          <div
            className="w-full h-full grid gap-2 sm:gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {board.map((val, idx) => {
              const emptyIdx = board.indexOf(0);
              const emptyR = Math.floor(emptyIdx / gridSize);
              const emptyC = emptyIdx % gridSize;
              const r = Math.floor(idx / gridSize);
              const c = idx % gridSize;
              const canMove = val !== 0 && (r === emptyR || c === emptyC);
              const isCorrect = isTileInCorrectPosition(val, idx);

              if (val === 0) {
                // Empty recessed slot matching reference image
                return (
                  <div
                    key={`empty-${idx}`}
                    className="w-full h-full rounded-xl sm:rounded-2xl bg-[#734625] dark:bg-[#472914] shadow-inner border border-black/15 transition-all"
                  />
                );
              }

              return (
                <button
                  key={`tile-${val}`}
                  onClick={() => handleTileClick(idx)}
                  className={`w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center font-display font-bold select-none transition-all duration-150 relative ${
                    gridSize === 3 ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"
                  } ${
                    canMove
                      ? "cursor-pointer hover:brightness-105 active:scale-95"
                      : "cursor-default"
                  } bg-[#ede9e2] text-[#1e232e] shadow-[0_4px_0_#b5aca0] active:shadow-[0_1px_0_#b5aca0] active:translate-y-[3px] border border-white/60`}
                >
                  <span>{val}</span>
                  {/* Subtle indicator dot when tile is in its exact solved spot */}
                  {isCorrect && (
                    <span className="absolute top-1.5 right-1.5 size-1.5 sm:size-2 rounded-full bg-emerald-500/80" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Idle Start Overlay */}
          {phase === "idle" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center rounded-2xl transition-all">
              <div className="size-12 rounded-2xl bg-[#ede9e2] text-[#8c5a36] flex items-center justify-center mb-3 shadow-lg">
                <Play className="size-6 fill-current ml-0.5" />
              </div>
              <h4 className="font-display text-lg font-bold text-white mb-1">
                NumPuz: Classic Number Riddle
              </h4>
              <p className="text-xs text-zinc-200 max-w-[240px] mb-4">
                Tap tiles to slide them into numerical order from 1 to {gridSize * gridSize - 1}!
              </p>
              <button
                onClick={() => {
                  setPhase("running");
                  startTimeRef.current = performance.now();
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Start NumPuz
              </button>
            </div>
          )}

          {/* Solved Celebration Screen Overlay */}
          {phase === "done" && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="size-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="font-display text-xl font-bold text-white mb-1">
                Puzzle Solved!
              </h4>
              <p className="text-xs text-zinc-200 mb-4">
                Completed in {moves} moves (
                <span className="font-bold text-emerald-400">
                  {time ? `${(time / 1000).toFixed(1)}s` : "—"}
                </span>
                )
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCurrentGame}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Replay
                </button>
                <button
                  onClick={() => startNewGame(gridSize)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md hover:bg-emerald-600 transition-colors"
                >
                  <Sparkles className="size-3.5" /> Next Shuffle →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Completion Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Stat label="Moves" value={String(moves)} />
        <Stat
          label="Progress"
          value={`${board.filter((v, i) => isTileInCorrectPosition(v, i)).length}/${gridSize * gridSize - 1}`}
        />
        <Stat
          label="Time"
          value={
            phase === "running"
              ? `${(elapsedDisplay / 1000).toFixed(1)}s`
              : time
                ? `${(time / 1000).toFixed(1)}s`
                : "—"
          }
        />
        <Stat label="Best" value={best ? `${(best / 1000).toFixed(1)}s` : "—"} />
      </div>
    </div>
  );
}

/* ---------------- Arrow Puzzle Challenge (Escape Maze) ---------------- */

type ArrowDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface ArrowCell {
  r: number;
  c: number;
}

interface MazeArrow {
  id: number;
  dir: ArrowDirection;
  cells: ArrowCell[]; // cells[0] is tail, cells[cells.length - 1] is head
}

const ARROW_DIR_DELTA: Record<ArrowDirection, { dr: number; dc: number }> = {
  UP: { dr: -1, dc: 0 },
  DOWN: { dr: 1, dc: 0 },
  LEFT: { dr: 0, dc: -1 },
  RIGHT: { dr: 0, dc: 1 },
};

function canArrowEscape(arrow: MazeArrow, allArrows: MazeArrow[], size: number): { canExit: boolean; blockerCell?: ArrowCell } {
  const head = arrow.cells[arrow.cells.length - 1];
  const delta = ARROW_DIR_DELTA[arrow.dir];
  let r = head.r + delta.dr;
  let c = head.c + delta.dc;

  const occupied = new Set<string>();
  for (const other of allArrows) {
    if (other.id === arrow.id) continue;
    for (const cell of other.cells) {
      occupied.add(`${cell.r},${cell.c}`);
    }
  }

  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (occupied.has(`${r},${c}`)) {
      return { canExit: false, blockerCell: { r, c } };
    }
    r += delta.dr;
    c += delta.dc;
  }
  return { canExit: true };
}

function solveArrowPuzzle(arrows: MazeArrow[], size: number): number[] | null {
  let remaining = [...arrows];
  const solutionOrder: number[] = [];

  while (remaining.length > 0) {
    const unblocked = remaining.find((a) => canArrowEscape(a, remaining, size).canExit);
    if (!unblocked) return null;
    solutionOrder.push(unblocked.id);
    remaining = remaining.filter((a) => a.id !== unblocked.id);
  }
  return solutionOrder;
}

function getFallbackArrowPuzzle(_size: number = 5): { arrows: MazeArrow[]; solution: number[] } {
  const arrows: MazeArrow[] = [
    { id: 0, dir: "RIGHT", cells: [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
    { id: 1, dir: "DOWN", cells: [{ r: 0, c: 2 }, { r: 1, c: 2 }] },
    { id: 2, dir: "UP", cells: [{ r: 4, c: 2 }, { r: 3, c: 2 }] },
    { id: 3, dir: "LEFT", cells: [{ r: 0, c: 3 }, { r: 0, c: 1 }, { r: 0, c: 0 }] },
    { id: 4, dir: "DOWN", cells: [{ r: 3, c: 4 }, { r: 4, c: 4 }] },
    { id: 5, dir: "UP", cells: [{ r: 4, c: 0 }, { r: 3, c: 0 }] },
  ];
  return { arrows, solution: [0, 1, 2, 3, 4, 5] };
}

function generateArrowPuzzle(size: number = 6, targetCount: number = 9): { arrows: MazeArrow[]; solution: number[] } {
  for (let attempt = 0; attempt < 1200; attempt++) {
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const arrows: MazeArrow[] = [];

    for (let id = 0; id < targetCount; id++) {
      const emptyCells: ArrowCell[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!grid[r][c]) emptyCells.push({ r, c });
        }
      }
      if (emptyCells.length < 2) break;

      const start = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const len = Math.floor(Math.random() * 3) + 2;
      const path: ArrowCell[] = [start];
      grid[start.r][start.c] = true;

      for (let step = 1; step < len; step++) {
        const curr = path[path.length - 1];
        const neighbors = [
          { r: curr.r - 1, c: curr.c },
          { r: curr.r + 1, c: curr.c },
          { r: curr.r, c: curr.c - 1 },
          { r: curr.r, c: curr.c + 1 },
        ].filter((n) => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && !grid[n.r][n.c]);

        if (neighbors.length === 0) break;
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[next.r][next.c] = true;
        path.push(next);
      }

      if (path.length >= 2) {
        const prev = path[path.length - 2];
        const head = path[path.length - 1];
        let dir: ArrowDirection = "UP";
        if (head.r < prev.r) dir = "UP";
        else if (head.r > prev.r) dir = "DOWN";
        else if (head.c < prev.c) dir = "LEFT";
        else if (head.c > prev.c) dir = "RIGHT";

        arrows.push({ id, dir, cells: path });
      } else {
        for (const p of path) grid[p.r][p.c] = false;
      }
    }

    if (arrows.length >= targetCount - 2) {
      const solution = solveArrowPuzzle(arrows, size);
      if (solution) {
        const initiallyFree = arrows.filter((a) => canArrowEscape(a, arrows, size).canExit);
        if (initiallyFree.length >= 1 && initiallyFree.length <= 4) {
          return { arrows, solution };
        }
      }
    }
  }

  return getFallbackArrowPuzzle(size);
}

function ArrowPuzzleGame() {
  const [gridSize, setGridSize] = useState<5 | 6>(5);
  const [puzzleData, setPuzzleData] = useState(() => generateArrowPuzzle(5, 7));
  const [arrows, setArrows] = useState<MazeArrow[]>(() => puzzleData.arrows);
  const [exitingArrow, setExitingArrow] = useState<{ id: number; dir: ArrowDirection } | null>(null);
  const [shakingArrowId, setShakingArrowId] = useState<number | null>(null);
  const [blockerCell, setBlockerCell] = useState<ArrowCell | null>(null);
  const [hintedArrowId, setHintedArrowId] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.arrowpuzzle.best");
    if (raw) setBest(Number(raw));
  }, []);

  useEffect(() => {
    if (phase === "running") {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedDisplay(Math.round(performance.now() - startTimeRef.current));
      }, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase]);

  const startNewPuzzle = (size: 5 | 6 = gridSize) => {
    const target = size === 5 ? 7 : 10;
    const newP = generateArrowPuzzle(size, target);
    setPuzzleData(newP);
    setArrows(newP.arrows);
    setExitingArrow(null);
    setShakingArrowId(null);
    setBlockerCell(null);
    setHintedArrowId(null);
    setMoves(0);
    setTime(null);
    setElapsedDisplay(0);
    setPhase("idle");
  };

  const resetCurrentPuzzle = () => {
    setArrows(puzzleData.arrows);
    setExitingArrow(null);
    setShakingArrowId(null);
    setBlockerCell(null);
    setHintedArrowId(null);
    setMoves(0);
    if (phase === "done") {
      setPhase("idle");
      setElapsedDisplay(0);
    }
  };

  const handleArrowTap = (arrow: MazeArrow) => {
    if (phase === "done" || exitingArrow) return;

    if (phase === "idle") {
      setPhase("running");
      startTimeRef.current = performance.now();
    }

    setHintedArrowId(null);
    const { canExit, blockerCell: blockedAt } = canArrowEscape(arrow, arrows, gridSize);

    if (canExit) {
      // Unblocked! Play exit animation and remove from board
      setExitingArrow({ id: arrow.id, dir: arrow.dir });
      setMoves((m) => m + 1);

      window.setTimeout(() => {
        setArrows((prev) => {
          const next = prev.filter((a) => a.id !== arrow.id);
          if (next.length === 0) {
            const elapsed = Math.round(performance.now() - startTimeRef.current);
            setPhase("done");
            setTime(elapsed);
            if (!best || elapsed < best) {
              setBest(elapsed);
              localStorage.setItem("lockin.warmup.arrowpuzzle.best", String(elapsed));
            }
          }
          return next;
        });
        setExitingArrow(null);
      }, 300);
    } else {
      // Blocked! Shake and highlight blocker
      setShakingArrowId(arrow.id);
      if (blockedAt) setBlockerCell(blockedAt);

      window.setTimeout(() => {
        setShakingArrowId(null);
        setBlockerCell(null);
      }, 500);
    }
  };

  const provideHint = () => {
    if (phase === "done" || arrows.length === 0) return;
    if (phase === "idle") {
      setPhase("running");
      startTimeRef.current = performance.now();
    }

    const freeArrow = arrows.find((a) => canArrowEscape(a, arrows, gridSize).canExit);
    if (freeArrow) {
      setHintedArrowId(freeArrow.id);
      window.setTimeout(() => {
        setHintedArrowId((cur) => (cur === freeArrow.id ? null : cur));
      }, 2500);
    }
  };

  const cellSize = 300 / gridSize;

  const getArrowheadPoints = (hx: number, hy: number, dir: ArrowDirection) => {
    const tipOffset = cellSize * 0.42;
    const baseOffset = cellSize * 0.12;
    const wing = cellSize * 0.32;

    switch (dir) {
      case "UP":
        return `${hx},${hy - tipOffset} ${hx - wing},${hy + baseOffset} ${hx},${hy} ${hx + wing},${hy + baseOffset}`;
      case "DOWN":
        return `${hx},${hy + tipOffset} ${hx - wing},${hy - baseOffset} ${hx},${hy} ${hx + wing},${hy - baseOffset}`;
      case "LEFT":
        return `${hx - tipOffset},${hy} ${hx + baseOffset},${hy - wing} ${hx},${hy} ${hx + baseOffset},${hy + wing}`;
      case "RIGHT":
        return `${hx + tipOffset},${hy} ${hx - baseOffset},${hy - wing} ${hx},${hy} ${hx - baseOffset},${hy + wing}`;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls & Grid Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border/50 text-xs font-semibold">
          <button
            onClick={() => {
              setGridSize(5);
              startNewPuzzle(5);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 5
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            5×5 Grid (Casual)
          </button>
          <button
            onClick={() => {
              setGridSize(6);
              startNewPuzzle(6);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 6
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            6×6 Grid (Maze)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={provideHint}
            title="Highlight a currently unblocked arrow"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
          >
            <Lightbulb className="size-3.5" />
            Hint
          </button>
          <button
            onClick={resetCurrentPuzzle}
            title="Reset arrows to initial layout"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl sfb-card hover:bg-secondary/70 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
          <button
            onClick={() => startNewPuzzle(gridSize)}
            title="Generate fresh new arrow maze layout"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] hover:opacity-90 transition-opacity shadow-sm"
          >
            <Shuffle className="size-3.5" />
            Rearrange
          </button>
        </div>
      </div>

      {/* Main Arrow Maze Grid (Inspired by Easybrain's Arrow Puzzle) */}
      <div className="relative">
        <div className="relative aspect-square max-w-[340px] sm:max-w-[380px] w-full mx-auto select-none rounded-2xl bg-zinc-50 dark:bg-[#0c0d15] border-2 border-zinc-200 dark:border-[#222436] shadow-xl p-2 sm:p-3 overflow-hidden transition-all">
          <svg viewBox="0 0 300 300" className="w-full h-full block">
            {/* Background Grid Lines */}
            {Array.from({ length: gridSize + 1 }).map((_, i) => (
              <g key={`arrow-grid-${i}`}>
                <line
                  x1={i * cellSize}
                  y1={0}
                  x2={i * cellSize}
                  y2={300}
                  stroke="currentColor"
                  className="text-zinc-200/80 dark:text-white/5"
                  strokeWidth="1.2"
                />
                <line
                  x1={0}
                  y1={i * cellSize}
                  x2={300}
                  y2={i * cellSize}
                  stroke="currentColor"
                  className="text-zinc-200/80 dark:text-white/5"
                  strokeWidth="1.2"
                />
              </g>
            ))}

            {/* Red alert flash on blocked cell if user taps an obstructed arrow */}
            {blockerCell && (
              <rect
                x={blockerCell.c * cellSize + 2}
                y={blockerCell.r * cellSize + 2}
                width={cellSize - 4}
                height={cellSize - 4}
                rx={cellSize * 0.2}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                className="animate-pulse"
              />
            )}

            {/* Render Each Maze Arrow */}
            {arrows.map((arrow) => {
              const isExiting = exitingArrow?.id === arrow.id;
              const isShaking = shakingArrowId === arrow.id;
              const isHinted = hintedArrowId === arrow.id;
              const isFree = canArrowEscape(arrow, arrows, gridSize).canExit;

              // Color: Electric blue when unblocked / hinted (like user reference image!), red on shake, dark navy/slate default
              const arrowColor = isShaking
                ? "#ef4444"
                : isHinted || isFree
                  ? "#2563eb"
                  : "var(--arrow-color, #1e293b)";

              const d = arrow.cells
                .map((pt, i) => `${i === 0 ? "M" : "L"} ${(pt.c + 0.5) * cellSize} ${(pt.r + 0.5) * cellSize}`)
                .join(" ");

              const head = arrow.cells[arrow.cells.length - 1];
              const hx = (head.c + 0.5) * cellSize;
              const hy = (head.r + 0.5) * cellSize;
              const arrowHeadPoints = getArrowheadPoints(hx, hy, arrow.dir);

              // Exit translation vector
              const delta = ARROW_DIR_DELTA[arrow.dir];
              const exitTransform = isExiting
                ? `translate(${delta.dc * 360}px, ${delta.dr * 360}px)`
                : "translate(0px, 0px)";

              return (
                <g
                  key={`arrow-${arrow.id}`}
                  onClick={() => handleArrowTap(arrow)}
                  style={{
                    transform: exitTransform,
                    opacity: isExiting ? 0 : 1,
                    transition: isExiting
                      ? "transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 280ms ease"
                      : "color 150ms ease",
                    cursor: "pointer",
                  }}
                  className={`group ${isShaking ? "animate-bounce" : ""}`}
                >
                  {/* Invisible wide hit area for effortless touch interaction */}
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={cellSize * 0.85}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Pulsing glow aura when hinted or freely unblocked */}
                  {(isHinted || isFree) && (
                    <path
                      d={d}
                      stroke="#3b82f6"
                      strokeWidth={cellSize * 0.46}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={isHinted ? 0.45 : 0.2}
                      className={isHinted ? "animate-pulse" : ""}
                    />
                  )}

                  {/* Arrow Body Pipe */}
                  <path
                    d={d}
                    stroke={arrowColor}
                    strokeWidth={cellSize * 0.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="transition-colors duration-150 dark:[--arrow-color:#cbd5e1]"
                  />

                  {/* Arrow Head Polygon */}
                  <polygon
                    points={arrowHeadPoints}
                    fill={arrowColor}
                    className="transition-colors duration-150 dark:[--arrow-color:#cbd5e1]"
                  />

                  {/* Center accent dot at tail for visual polish */}
                  <circle
                    cx={(arrow.cells[0].c + 0.5) * cellSize}
                    cy={(arrow.cells[0].r + 0.5) * cellSize}
                    r={cellSize * 0.08}
                    fill="#ffffff"
                    opacity={0.65}
                  />
                </g>
              );
            })}
          </svg>

          {/* Idle Start Screen Overlay */}
          {phase === "idle" && (
            <div className="absolute inset-0 bg-background/80 dark:bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center rounded-2xl transition-all">
              <div className="size-12 rounded-2xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] flex items-center justify-center mb-3 shadow-lg">
                <Navigation className="size-6 fill-current ml-0.5" />
              </div>
              <h4 className="font-display text-lg font-bold text-foreground mb-1">
                Arrow Puzzle Challenge
              </h4>
              <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
                Tap arrows with an unblocked exit path to escape the maze. Figure out the right order!
              </p>
              <button
                onClick={() => {
                  setPhase("running");
                  startTimeRef.current = performance.now();
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Start Challenge
              </button>
            </div>
          )}

          {/* Solved Celebration Screen Overlay */}
          {phase === "done" && (
            <div className="absolute inset-0 bg-background/90 dark:bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="size-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="font-display text-xl font-bold text-foreground mb-1">
                Maze Cleared!
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                All {puzzleData.arrows.length} arrows escaped in {moves} moves (
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {time ? `${(time / 1000).toFixed(1)}s` : "—"}
                </span>
                )
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCurrentPuzzle}
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-80 transition-opacity"
                >
                  Replay
                </button>
                <button
                  onClick={() => startNewPuzzle(gridSize)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-colors"
                >
                  <Sparkles className="size-3.5" /> Next Puzzle →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Completion Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Stat label="Remaining" value={`${arrows.length}/${puzzleData.arrows.length}`} />
        <Stat label="Moves" value={String(moves)} />
        <Stat
          label="Time"
          value={
            phase === "running"
              ? `${(elapsedDisplay / 1000).toFixed(1)}s`
              : time
                ? `${(time / 1000).toFixed(1)}s`
                : "—"
          }
        />
        <Stat label="Best" value={best ? `${(best / 1000).toFixed(1)}s` : "—"} />
      </div>
    </div>
  );
}

/* ---------------- Connect Dots: Puzzle Challenge (Flow-Style Non-Overlapping Grid) ---------------- */

interface Cell {
  r: number;
  c: number;
}

interface DotColor {
  id: number;
  name: string;
  hex: string;
  glow: string;
}

const PUZZLE_COLORS: DotColor[] = [
  { id: 0, name: "Yellow", hex: "#facc15", glow: "rgba(250, 204, 21, 0.45)" },
  { id: 1, name: "Orange", hex: "#f97316", glow: "rgba(249, 115, 22, 0.45)" },
  { id: 2, name: "Red", hex: "#ef4444", glow: "rgba(239, 68, 68, 0.45)" },
  { id: 3, name: "Blue", hex: "#3b82f6", glow: "rgba(59, 130, 246, 0.45)" },
  { id: 4, name: "Green", hex: "#22c55e", glow: "rgba(34, 197, 94, 0.45)" },
  { id: 5, name: "Purple", hex: "#a855f7", glow: "rgba(168, 85, 247, 0.45)" },
];

interface EndpointPair {
  colorId: number;
  start: Cell;
  end: Cell;
}

interface PuzzleBoard {
  size: number;
  numColors: number;
  endpoints: EndpointPair[];
}

function generatePuzzle(size: number = 5, numColors: number = 5): PuzzleBoard {
  for (let attempt = 0; attempt < 800; attempt++) {
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
    const paths: Cell[][] = Array.from({ length: numColors }, () => []);

    const allCoords: Cell[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) allCoords.push({ r, c });
    }
    // Shuffle coordinates randomly
    for (let i = allCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
    }

    for (let i = 0; i < numColors; i++) {
      const { r, c } = allCoords[i];
      grid[r][c] = i;
      paths[i].push({ r, c });
    }

    let grew = true;
    while (grew) {
      grew = false;
      const order = Array.from({ length: numColors }, (_, i) => i).sort(() => Math.random() - 0.5);
      for (const color of order) {
        const path = paths[color];
        const head = path[path.length - 1];
        const tail = path[0];

        const neighborsEnd = [
          { r: head.r - 1, c: head.c },
          { r: head.r + 1, c: head.c },
          { r: head.r, c: head.c - 1 },
          { r: head.r, c: head.c + 1 },
        ].filter((n) => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && grid[n.r][n.c] === -1);

        const neighborsStart = [
          { r: tail.r - 1, c: tail.c },
          { r: tail.r + 1, c: tail.c },
          { r: tail.r, c: tail.c - 1 },
          { r: tail.r, c: tail.c + 1 },
        ].filter((n) => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && grid[n.r][n.c] === -1);

        if (neighborsEnd.length > 0 && (neighborsStart.length === 0 || Math.random() < 0.5)) {
          const next = neighborsEnd[Math.floor(Math.random() * neighborsEnd.length)];
          grid[next.r][next.c] = color;
          path.push(next);
          grew = true;
        } else if (neighborsStart.length > 0) {
          const next = neighborsStart[Math.floor(Math.random() * neighborsStart.length)];
          grid[next.r][next.c] = color;
          path.unshift(next);
          grew = true;
        }
      }
    }

    // Require all paths to be at least 3 cells long
    const allLongEnough = paths.every((p) => p.length >= 3);
    if (!allLongEnough) continue;

    // Require endpoints to be separated by Manhattan distance >= 2
    const separated = paths.every((p) => {
      const start = p[0];
      const end = p[p.length - 1];
      return Math.abs(start.r - end.r) + Math.abs(start.c - end.c) >= 2;
    });
    if (!separated) continue;

    const emptyCount = grid.flat().filter((x) => x === -1).length;
    if (emptyCount <= 2) {
      return {
        size,
        numColors,
        endpoints: paths.map((p, idx) => ({
          colorId: idx,
          start: p[0],
          end: p[p.length - 1],
        })),
      };
    }
  }

  // Guaranteed fallback 5x5 board
  return {
    size: 5,
    numColors: 5,
    endpoints: [
      { colorId: 0, start: { r: 0, c: 0 }, end: { r: 1, c: 3 } },
      { colorId: 1, start: { r: 2, c: 0 }, end: { r: 4, c: 0 } },
      { colorId: 2, start: { r: 2, c: 1 }, end: { r: 4, c: 2 } },
      { colorId: 3, start: { r: 0, c: 4 }, end: { r: 4, c: 3 } },
      { colorId: 4, start: { r: 1, c: 1 }, end: { r: 3, c: 2 } },
    ],
  };
}

function ColorConnectGame() {
  const [gridSize, setGridSize] = useState<5 | 6>(5);
  const [puzzle, setPuzzle] = useState<PuzzleBoard>(() => generatePuzzle(5, 5));
  const [userPaths, setUserPaths] = useState<Record<number, Cell[]>>({});
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState<number>(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const activeColorRef = useRef<number | null>(null);
  const userPathsRef = useRef<Record<number, Cell[]>>({});
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Keep refs in sync with state
  userPathsRef.current = userPaths;
  activeColorRef.current = activeColor;

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.connectdots.best");
    if (raw) setBest(Number(raw));
  }, []);

  // Timer loop when running
  useEffect(() => {
    if (phase === "running") {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedDisplay(Math.round(performance.now() - startTimeRef.current));
      }, 100);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase]);

  // Check if a specific color's flow is fully connected
  const isColorConnected = (colorId: number): boolean => {
    const path = userPaths[colorId];
    if (!path || path.length < 2) return false;
    const ep = puzzle.endpoints.find((e) => e.colorId === colorId);
    if (!ep) return false;
    const s = path[0];
    const e = path[path.length - 1];
    return (
      (s.r === ep.start.r && s.c === ep.start.c && e.r === ep.end.r && e.c === ep.end.c) ||
      (s.r === ep.end.r && s.c === ep.end.c && e.r === ep.start.r && e.c === ep.start.c)
    );
  };

  const connectedCount = puzzle.endpoints.filter((ep) => isColorConnected(ep.colorId)).length;

  // Calculate filled cells
  const coveredCellsCount = useMemo(() => {
    const cells = new Set<string>();
    for (const path of Object.values(userPaths)) {
      for (const p of path) {
        cells.add(`${p.r},${p.c}`);
      }
    }
    return cells.size;
  }, [userPaths]);

  // Check win condition whenever paths change
  useEffect(() => {
    if (phase !== "running" || puzzle.endpoints.length === 0) return;
    const allConnected = puzzle.endpoints.every((ep) => isColorConnected(ep.colorId));
    if (allConnected) {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setPhase("done");
      setTime(elapsed);
      if (!best || elapsed < best) {
        setBest(elapsed);
        localStorage.setItem("lockin.warmup.connectdots.best", String(elapsed));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPaths, phase, puzzle, best]);

  // Start new puzzle and rearrange
  const startNewPuzzle = (size: 5 | 6 = gridSize) => {
    const colorsCount = size === 5 ? 5 : 6;
    const newBoard = generatePuzzle(size, colorsCount);
    setPuzzle(newBoard);
    setUserPaths({});
    userPathsRef.current = {};
    setActiveColor(null);
    activeColorRef.current = null;
    isDrawingRef.current = false;
    setTime(null);
    setElapsedDisplay(0);
    setPhase("idle");
  };

  const resetCurrentBoard = () => {
    setUserPaths({});
    userPathsRef.current = {};
    setActiveColor(null);
    activeColorRef.current = null;
    isDrawingRef.current = false;
    if (phase === "done") {
      setPhase("idle");
      setElapsedDisplay(0);
    }
  };

  // Convert pointer event to grid (row, col)
  const getCellFromPointer = (e: React.PointerEvent<HTMLDivElement>): Cell | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const c = Math.floor((x / rect.width) * puzzle.size);
    const r = Math.floor((y / rect.height) * puzzle.size);
    if (r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size) {
      return { r, c };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "done") return;
    const cell = getCellFromPointer(e);
    if (!cell) return;

    if (phase === "idle") {
      setPhase("running");
      startTimeRef.current = performance.now();
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // Check if user tapped an endpoint dot
    const ep = puzzle.endpoints.find(
      (item) => (item.start.r === cell.r && item.start.c === cell.c) || (item.end.r === cell.r && item.end.c === cell.c)
    );

    if (ep) {
      activeColorRef.current = ep.colorId;
      setActiveColor(ep.colorId);
      isDrawingRef.current = true;

      setUserPaths((prev) => {
        const next = { ...prev };
        next[ep.colorId] = [{ r: cell.r, c: cell.c }];
        return next;
      });
      return;
    }

    // Check if user tapped along an existing path to resume/edit
    for (const [colStr, path] of Object.entries(userPathsRef.current)) {
      const colId = Number(colStr);
      const hitIdx = path.findIndex((p) => p.r === cell.r && p.c === cell.c);
      if (hitIdx !== -1) {
        activeColorRef.current = colId;
        setActiveColor(colId);
        isDrawingRef.current = true;

        setUserPaths((prev) => {
          const next = { ...prev };
          next[colId] = path.slice(0, hitIdx + 1);
          return next;
        });
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || activeColorRef.current === null) return;
    const cell = getCellFromPointer(e);
    if (!cell) return;

    const colorId = activeColorRef.current;
    const currentPath = userPathsRef.current[colorId] || [];
    if (currentPath.length === 0) return;

    const head = currentPath[currentPath.length - 1];
    if (head.r === cell.r && head.c === cell.c) return;

    // Must be orthogonally adjacent (1 grid step: horizontal or vertical, no diagonal)
    const isAdjacent = Math.abs(head.r - cell.r) + Math.abs(head.c - cell.c) === 1;
    if (!isAdjacent) return;

    // Backtracking / undo when dragging backwards into previous cell
    if (currentPath.length >= 2) {
      const prevCell = currentPath[currentPath.length - 2];
      if (prevCell.r === cell.r && prevCell.c === cell.c) {
        setUserPaths((prev) => {
          const next = { ...prev };
          next[colorId] = currentPath.slice(0, -1);
          return next;
        });
        return;
      }
    }

    // Loop check: if user moves into an earlier part of their own path, trim back to it
    const selfIdx = currentPath.findIndex((p) => p.r === cell.r && p.c === cell.c);
    if (selfIdx !== -1) {
      setUserPaths((prev) => {
        const next = { ...prev };
        next[colorId] = currentPath.slice(0, selfIdx + 1);
        return next;
      });
      return;
    }

    // Block stepping on an endpoint of a DIFFERENT color
    const otherEp = puzzle.endpoints.find(
      (item) => item.colorId !== colorId && (
        (item.start.r === cell.r && item.start.c === cell.c) ||
        (item.end.r === cell.r && item.end.c === cell.c)
      )
    );
    if (otherEp) return;

    // Check if this cell is the other endpoint of the CURRENT color
    const myEp = puzzle.endpoints.find((item) => item.colorId === colorId);
    const startDot = currentPath[0];
    const isTargetEnd = myEp && (
      (cell.r === myEp.start.r && cell.c === myEp.start.c && (startDot.r !== cell.r || startDot.c !== cell.c)) ||
      (cell.r === myEp.end.r && cell.c === myEp.end.c && (startDot.r !== cell.r || startDot.c !== cell.c))
    );

    // Flow Free non-overlap rule:
    // If moving into a cell occupied by another color's path, cut that other color's path so colors never overlap!
    setUserPaths((prev) => {
      const next = { ...prev };
      for (const [cStr, otherPath] of Object.entries(next)) {
        const otherId = Number(cStr);
        if (otherId === colorId) continue;
        const hit = otherPath.findIndex((p) => p.r === cell.r && p.c === cell.c);
        if (hit !== -1) {
          next[otherId] = otherPath.slice(0, hit);
        }
      }
      next[colorId] = [...currentPath, cell];
      return next;
    });

    // If reaching the matching endpoint, finish drawing this color!
    if (isTargetEnd) {
      isDrawingRef.current = false;
      activeColorRef.current = null;
      setActiveColor(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDrawingRef.current = false;
    activeColorRef.current = null;
    setActiveColor(null);
  };

  const cellSize = 300 / puzzle.size;

  return (
    <div className="space-y-5">
      {/* Top Controls & Grid Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border/50 text-xs font-semibold">
          <button
            onClick={() => {
              setGridSize(5);
              startNewPuzzle(5);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 5
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            5×5 Grid (5 Colors)
          </button>
          <button
            onClick={() => {
              setGridSize(6);
              startNewPuzzle(6);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              gridSize === 6
                ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            6×6 Grid (6 Colors)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetCurrentBoard}
            title="Clear all drawn lines"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl sfb-card hover:bg-secondary/70 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
          <button
            onClick={() => startNewPuzzle(gridSize)}
            title="Rearrange board with new puzzle layout"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] hover:opacity-90 transition-opacity shadow-sm"
          >
            <Shuffle className="size-3.5" />
            Rearrange
          </button>
        </div>
      </div>

      {/* Main Flow Free Puzzle Grid (Identical dark aesthetic to user's reference image) */}
      <div className="relative">
        <div
          ref={boardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
          className="relative aspect-square max-w-[340px] sm:max-w-[380px] w-full mx-auto select-none rounded-2xl bg-[#0f1016] border-2 border-[#2b2d3d] shadow-2xl p-2 sm:p-2.5 overflow-hidden cursor-crosshair transition-all"
        >
          <svg viewBox="0 0 300 300" className="w-full h-full block">
            {/* Background Grid Lines */}
            {Array.from({ length: puzzle.size + 1 }).map((_, i) => (
              <g key={`grid-${i}`}>
                <line
                  x1={i * cellSize}
                  y1={0}
                  x2={i * cellSize}
                  y2={300}
                  stroke="#27293a"
                  strokeWidth="1.6"
                />
                <line
                  x1={0}
                  y1={i * cellSize}
                  x2={300}
                  y2={i * cellSize}
                  stroke="#27293a"
                  strokeWidth="1.6"
                />
              </g>
            ))}

            {/* Render Drawn Colored Paths (Non-Overlapping Rounded Pipes) */}
            {Object.entries(userPaths).map(([colorStr, path]) => {
              const colorId = Number(colorStr);
              const colorDef = PUZZLE_COLORS[colorId] || PUZZLE_COLORS[0];
              if (!path || path.length < 2) return null;

              const d = path
                .map((pt, i) => `${i === 0 ? "M" : "L"} ${(pt.c + 0.5) * cellSize} ${(pt.r + 0.5) * cellSize}`)
                .join(" ");

              const isDone = isColorConnected(colorId);

              return (
                <g key={`path-${colorId}`}>
                  {/* Outer subtle glow if flow is completed */}
                  {isDone && (
                    <path
                      d={d}
                      stroke={colorDef.hex}
                      strokeWidth={cellSize * 0.44}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={0.3}
                    />
                  )}
                  {/* Main solid pipe body matching Flow Free style */}
                  <path
                    d={d}
                    stroke={colorDef.hex}
                    strokeWidth={cellSize * 0.38}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={1}
                  />
                  {/* Smooth inner specular line for premium glass finish */}
                  <path
                    d={d}
                    stroke="#ffffff"
                    strokeWidth={cellSize * 0.09}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.25}
                  />
                </g>
              );
            })}

            {/* Render Endpoint Dots */}
            {puzzle.endpoints.map((ep) => {
              const colorDef = PUZZLE_COLORS[ep.colorId] || PUZZLE_COLORS[0];
              const isDone = isColorConnected(ep.colorId);
              const isActive = activeColor === ep.colorId;

              const dots = [ep.start, ep.end];

              return dots.map((dot, idx) => {
                const cx = (dot.c + 0.5) * cellSize;
                const cy = (dot.r + 0.5) * cellSize;

                return (
                  <g key={`ep-${ep.colorId}-${idx}`}>
                    {/* Active pulse aura */}
                    {isActive && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={cellSize * 0.42}
                        fill={colorDef.hex}
                        opacity={0.4}
                        className="animate-ping"
                      />
                    )}
                    {/* Outer halo */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={cellSize * 0.34}
                      fill={colorDef.hex}
                      opacity={isDone ? 0.9 : 0.8}
                    />
                    {/* Solid core dot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={cellSize * 0.28}
                      fill={colorDef.hex}
                    />
                    {/* Center node specular dot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={cellSize * 0.11}
                      fill="#ffffff"
                      opacity={isDone ? 0.95 : 0.45}
                    />
                  </g>
                );
              });
            })}
          </svg>

          {/* Idle Start Overlay */}
          {phase === "idle" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center rounded-2xl transition-all">
              <div className="size-12 rounded-2xl bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] flex items-center justify-center mb-3 shadow-lg">
                <Play className="size-6 fill-current ml-0.5" />
              </div>
              <h4 className="font-display text-lg font-bold text-white mb-1">
                Connect Dots Challenge
              </h4>
              <p className="text-xs text-zinc-300 max-w-[240px] mb-4">
                Drag between matching colored dots. Paths must not overlap or cross!
              </p>
              <button
                onClick={() => {
                  setPhase("running");
                  startTimeRef.current = performance.now();
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Start Puzzle
              </button>
            </div>
          )}

          {/* Puzzle Solved Celebration Overlay */}
          {phase === "done" && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="size-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="font-display text-xl font-bold text-white mb-1">
                Puzzle Completed!
              </h4>
              <p className="text-xs text-zinc-300 mb-4">
                All {puzzle.endpoints.length} color flows connected in{" "}
                <span className="font-bold text-emerald-400">
                  {time ? `${(time / 1000).toFixed(1)}s` : "—"}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCurrentBoard}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Replay
                </button>
                <button
                  onClick={() => startNewPuzzle(gridSize)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md hover:bg-emerald-600 transition-colors"
                >
                  <Sparkles className="size-3.5" /> Next Puzzle →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Completion Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Stat label="Flows" value={`${connectedCount}/${puzzle.endpoints.length}`} />
        <Stat
          label="Pipes"
          value={`${Math.round((coveredCellsCount / (puzzle.size * puzzle.size)) * 100)}%`}
        />
        <Stat
          label="Time"
          value={
            phase === "running"
              ? `${(elapsedDisplay / 1000).toFixed(1)}s`
              : time
                ? `${(time / 1000).toFixed(1)}s`
                : "—"
          }
        />
        <Stat label="Best" value={best ? `${(best / 1000).toFixed(1)}s` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

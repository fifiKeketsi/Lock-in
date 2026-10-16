import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, RotateCcw, Zap, Grid3x3, Calculator, Palette, Hash, Circle, Lock } from "lucide-react";
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

type GameId = "reaction" | "sequence" | "math" | "stroop" | "nback" | "colorconnect";

const GAMES: { id: GameId; name: string; tag: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "reaction", name: "Reaction", tag: "~30s", icon: Zap, desc: "Wait for green, tap fast." },
  { id: "sequence", name: "Sequence", tag: "~60s", icon: Grid3x3, desc: "Repeat the growing pattern." },
  { id: "math", name: "Math sprint", tag: "60s", icon: Calculator, desc: "Solve as many as you can." },
  { id: "stroop", name: "Stroop", tag: "30s", icon: Palette, desc: "Tap the ink color, not the word." },
  { id: "nback", name: "N-Back", tag: "~60s", icon: Hash, desc: "Match the number from 2 steps ago." },
  { id: "colorconnect", name: "Color Connect", tag: "~45s", icon: Circle, desc: "Connect matching color pairs." },
];

function WarmupPage() {
  const { state } = useLockIn();
  const [game, setGame] = useState<GameId>("reaction");

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
                Account Required
              </span>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Sign In to Play Warm-ups
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                Log in or create an account to play cognitive warm-up games and track your reaction times.
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

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12 space-y-6">
        <div className="text-center space-y-2.5">
          <span className="sfb-badge-lemon inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Brain className="size-3" /> Cognitive Priming
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Prime your brain.<br />
            <span className="font-editorial italic font-normal text-muted-foreground">Fast cognitive games to enter flow state.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Pick a 30-second cognitive mini-game to shift your neural circuits from passive doom-scrolling into active study focus.
          </p>
        </div>

        {/* Game Switcher Bento Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {GAMES.map((g) => {
            const Icon = g.icon;
            const active = game === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGame(g.id)}
                className={`rounded-2xl p-4 text-left transition-all duration-200 border ${
                  active
                    ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] border-transparent shadow-md scale-[1.02]"
                    : "sfb-card hover:border-black/20 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="size-4" />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    active ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "sfb-badge-lemon"
                  }`}>
                    {g.tag}
                  </span>
                </div>
                <div className="font-bold text-sm">{g.name}</div>
                <div className={`text-[11px] mt-0.5 truncate ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {g.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="sfb-card p-6 md:p-8">
          {game === "reaction" && <ReactionGame />}
          {game === "sequence" && <SequenceGame />}
          {game === "math" && <MathGame />}
          {game === "stroop" && <StroopGame />}
          {game === "nback" && <NBackGame />}
          {game === "colorconnect" && <ColorConnectGame />}
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

/* ---------------- Reaction ---------------- */
type RPhase = "idle" | "wait" | "go" | "done" | "early";
function ReactionGame() {
  const [phase, setPhase] = useState<RPhase>("idle");
  const [start, setStart] = useState(0);
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.best");
    if (raw) setBest(Number(raw));
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  function begin() {
    setTime(null);
    setPhase("wait");
    const delay = 1200 + Math.random() * 2500;
    timer.current = setTimeout(() => {
      setStart(performance.now());
      setPhase("go");
    }, delay);
  }

  function click() {
    if (phase === "wait") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const t = Math.round(performance.now() - start);
      setTime(t);
      setPhase("done");
      if (!best || t < best) {
        setBest(t);
        localStorage.setItem("lockin.warmup.best", String(t));
      }
    }
  }

  const bg =
    phase === "go" ? "bg-success text-success-foreground" :
    phase === "wait" ? "bg-destructive text-destructive-foreground" :
    phase === "early" ? "bg-warning text-warning-foreground" :
    "bg-secondary text-secondary-foreground";

  const label =
    phase === "idle" ? "Tap to begin" :
    phase === "wait" ? "Wait for green…" :
    phase === "go" ? "TAP NOW!" :
    phase === "early" ? "Too early — tap to retry" :
    `${time} ms — tap to retry`;

  return (
    <div>
      <button
        onClick={phase === "idle" || phase === "done" || phase === "early" ? begin : click}
        className={`w-full h-72 rounded-3xl ${bg} font-display text-3xl font-semibold transition-colors shadow-soft`}
      >
        {label}
      </button>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Last" value={time ? `${time} ms` : "—"} />
        <Stat label="Best" value={best ? `${best} ms` : "—"} />
      </div>
    </div>
  );
}

/* ---------------- Sequence (Simon) ---------------- */
function SequenceGame() {
  const COLORS = ["bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-rose-500"];
  const [seq, setSeq] = useState<number[]>([]);
  const [userIdx, setUserIdx] = useState(0);
  const [playing, setPlaying] = useState<"idle" | "show" | "input" | "fail">("idle");
  const [active, setActive] = useState<number | null>(null);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.seq.best");
    if (raw) setBest(Number(raw));
  }, []);

  function start() {
    const first = [Math.floor(Math.random() * 4)];
    setSeq(first);
    setUserIdx(0);
    playSeq(first);
  }

  function playSeq(s: number[]) {
    setPlaying("show");
    setUserIdx(0);
    let i = 0;
    const tick = () => {
      if (i >= s.length) {
        setActive(null);
        setPlaying("input");
        return;
      }
      setActive(s[i]);
      setTimeout(() => {
        setActive(null);
        setTimeout(() => { i++; tick(); }, 180);
      }, 420);
    };
    setTimeout(tick, 500);
  }

  function tap(i: number) {
    if (playing !== "input") return;
    if (seq[userIdx] !== i) {
      setPlaying("fail");
      if (seq.length - 1 > best) {
        setBest(seq.length - 1);
        localStorage.setItem("lockin.warmup.seq.best", String(seq.length - 1));
      }
      return;
    }
    if (userIdx === seq.length - 1) {
      const next = [...seq, Math.floor(Math.random() * 4)];
      setSeq(next);
      setTimeout(() => playSeq(next), 400);
    } else {
      setUserIdx(userIdx + 1);
    }
  }

  return (
    <div>
      <div className="card-surface p-4 text-center mb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Round</div>
        <div className="font-display text-3xl font-semibold tabular-nums">{seq.length || "—"}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {playing === "idle" && "Tap Start"}
          {playing === "show" && "Watch the pattern…"}
          {playing === "input" && "Your turn"}
          {playing === "fail" && "Missed it — try again"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {COLORS.map((c, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            className={`h-32 rounded-2xl shadow-soft transition-all ${c} ${active === i ? "opacity-100 scale-[0.98]" : "opacity-60"}`}
            aria-label={`Pad ${i + 1}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Best round" value={best ? String(best) : "—"} />
        <button onClick={start} className="rounded-xl bg-primary text-primary-foreground font-medium">
          {playing === "idle" || playing === "fail" ? "Start" : "Restart"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Math sprint ---------------- */
function MathGame() {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [q, setQ] = useState(() => makeQ());
  const [answer, setAnswer] = useState("");

  function makeQ() {
    const ops = ["+", "-", "×"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 0, b = 0, ans = 0;
    if (op === "+") { a = rand(10, 60); b = rand(10, 60); ans = a + b; }
    if (op === "-") { a = rand(20, 80); b = rand(1, a); ans = a - b; }
    if (op === "×") { a = rand(3, 12); b = rand(3, 12); ans = a * b; }
    return { a, b, op, ans };
  }
  function rand(lo: number, hi: number) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.math.best");
    if (raw) setBest(Number(raw));
  }, []);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      if (score > best) {
        setBest(score);
        localStorage.setItem("lockin.warmup.math.best", String(score));
      }
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft, score, best]);

  function start() {
    setScore(0); setTimeLeft(60); setRunning(true); setAnswer(""); setQ(makeQ());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!running) return;
    if (Number(answer) === q.ans) setScore((s) => s + 1);
    else setScore((s) => Math.max(0, s - 1));
    setAnswer("");
    setQ(makeQ());
  }

  return (
    <div>
      <div className="card-surface p-6 text-center">
        <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Score {score}</span>
          <span>{timeLeft}s</span>
        </div>
        <div className="font-display text-5xl font-semibold mt-4 tabular-nums">
          {q.a} {q.op} {q.b}
        </div>
        <form onSubmit={submit} className="mt-4">
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!running}
            placeholder={running ? "Answer" : "Tap Start"}
            className="w-full text-center text-2xl font-display py-3 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Best" value={best ? String(best) : "—"} />
        <button onClick={start} className="rounded-xl bg-primary text-primary-foreground font-medium">
          {running ? "Restart" : "Start 60s"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Stroop ---------------- */
function StroopGame() {
  const COLORS = [
    { name: "RED", cls: "text-red-500", key: "red" },
    { name: "BLUE", cls: "text-blue-500", key: "blue" },
    { name: "GREEN", cls: "text-green-500", key: "green" },
    { name: "YELLOW", cls: "text-yellow-500", key: "yellow" },
  ];
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(() => makeRound());

  function makeRound() {
    const word = COLORS[Math.floor(Math.random() * 4)];
    let ink = COLORS[Math.floor(Math.random() * 4)];
    if (Math.random() > 0.3) {
      while (ink.key === word.key) ink = COLORS[Math.floor(Math.random() * 4)];
    }
    return { word, ink };
  }

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.stroop.best");
    if (raw) setBest(Number(raw));
  }, []);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      if (score > best) {
        setBest(score);
        localStorage.setItem("lockin.warmup.stroop.best", String(score));
      }
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft, score, best]);

  function pick(key: string) {
    if (!running) return;
    if (key === round.ink.key) setScore((s) => s + 1);
    else setScore((s) => Math.max(0, s - 1));
    setRound(makeRound());
  }

  function start() {
    setScore(0); setTimeLeft(30); setRunning(true); setRound(makeRound());
  }

  return (
    <div>
      <div className="card-surface p-8 text-center">
        <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Score {score}</span>
          <span>{timeLeft}s</span>
        </div>
        <div className={`font-display text-6xl font-bold mt-6 ${round.ink.cls}`}>
          {running ? round.word.name : "READY"}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Tap the INK color (not the word)</div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {COLORS.map((c) => (
          <button
            key={c.key}
            onClick={() => pick(c.key)}
            disabled={!running}
            className={`py-3 rounded-xl font-semibold bg-secondary ${c.cls} disabled:opacity-50`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Best" value={best ? String(best) : "—"} />
        <button onClick={start} className="rounded-xl bg-primary text-primary-foreground font-medium">
          {running ? "Restart" : "Start 30s"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- N-Back ---------------- */
function NBackGame() {
  const N = 2;
  const TOTAL = 20;
  const [running, setRunning] = useState(false);
  const [trial, setTrial] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [best, setBest] = useState(0);
  const history = useRef<number[]>([]);
  const answered = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.nback.best");
    if (raw) setBest(Number(raw));
  }, []);

  useEffect(() => {
    if (!running) return;
    if (trial >= TOTAL) {
      setRunning(false);
      if (hits > best) {
        setBest(hits);
        localStorage.setItem("lockin.warmup.nback.best", String(hits));
      }
      setCurrent(null);
      return;
    }
    const id = setTimeout(() => {
      // grade unanswered
      if (!answered.current && trial >= N) {
        const isMatch = history.current[history.current.length - N] === current;
        if (isMatch) setMisses((m) => m + 1);
      }
      // next
      let next = Math.floor(Math.random() * 9) + 1;
      if (trial >= N && Math.random() < 0.35) next = history.current[history.current.length - N];
      history.current.push(next);
      setCurrent(next);
      answered.current = false;
      setTrial((t) => t + 1);
    }, 1800);
    return () => clearTimeout(id);
  }, [running, trial, current, hits, best]);

  function start() {
    history.current = [];
    answered.current = false;
    setTrial(0); setHits(0); setMisses(0); setCurrent(null); setRunning(true);
  }

  function match() {
    if (!running || answered.current || trial <= N) return;
    answered.current = true;
    const isMatch = history.current[history.current.length - 1 - N] === current;
    if (isMatch) setHits((h) => h + 1);
    else setMisses((m) => m + 1);
  }

  return (
    <div>
      <div className="card-surface p-6 text-center">
        <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Trial {Math.min(trial, TOTAL)}/{TOTAL}</span>
          <span>Hits {hits} · Miss {misses}</span>
        </div>
        <div className="font-display text-7xl font-semibold mt-4 tabular-nums h-24 flex items-center justify-center">
          {current ?? (running ? "…" : "—")}
        </div>
        <div className="text-xs text-muted-foreground">Tap MATCH if this equals the number from {N} steps ago</div>
        <button
          onClick={match}
          disabled={!running || trial <= N}
          className="mt-4 w-full py-4 rounded-xl bg-primary text-primary-foreground font-display text-xl font-semibold disabled:opacity-40"
        >
          MATCH
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Best hits" value={best ? String(best) : "—"} />
        <button onClick={start} className="rounded-xl bg-secondary font-medium">
          <RotateCcw className="inline size-4 mr-1" /> {running ? "Restart" : "Start"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Color Connect (pair matching) ---------------- */
const PAIR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
];

function generateSpiral(n: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = t * 5 * Math.PI;
    const radius = 42 * (1 - t * 0.75);
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    pts.push({ x, y });
  }
  return pts;
}

function makeAssignments(count: number): number[] {
  // each color index appears exactly twice, shuffled randomly
  const arr: number[] = [];
  for (let i = 0; i < count / 2; i++) arr.push(i, i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ColorConnectGame() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [selected, setSelected] = useState<number | null>(null);
  const [pairs, setPairs] = useState<{ a: number; b: number; colorIdx: number }[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [errorIdx, setErrorIdx] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const startTime = useRef<number>(0);
  const positions = useMemo(() => generateSpiral(20), []);

  useEffect(() => {
    const raw = localStorage.getItem("lockin.warmup.colorconnect.best");
    if (raw) setBest(Number(raw));
  }, []);

  function start() {
    const assignments = makeAssignments(20);
    const newPairs: { a: number; b: number; colorIdx: number }[] = [];
    for (let c = 0; c < 10; c++) {
      const indices = assignments
        .map((colorIdx, idx) => ({ colorIdx, idx }))
        .filter((x) => x.colorIdx === c)
        .map((x) => x.idx);
      if (indices.length === 2) {
        newPairs.push({ a: indices[0], b: indices[1], colorIdx: c });
      }
    }
    setPairs(newPairs);
    setSelected(null);
    setMatched(new Set());
    setErrorIdx(null);
    setTime(null);
    setPhase("running");
    startTime.current = 0;
  }

  function tap(index: number) {
    if (phase !== "running") return;
    if (matched.has(index)) return;
    const now = performance.now();
    if (matched.size === 0 && !selected) startTime.current = now;

    if (selected === null) {
      setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const selColor = pairs.find((p) => p.a === selected || p.b === selected);
    const tapColor = pairs.find((p) => p.a === index || p.b === index);

    if (selColor && tapColor && selColor.colorIdx === tapColor.colorIdx) {
      // correct match
      const nextMatched = new Set(matched);
      nextMatched.add(selected);
      nextMatched.add(index);
      setMatched(nextMatched);
      setSelected(null);
      if (nextMatched.size === 20) {
        const elapsed = Math.round(now - startTime.current);
        setTime(elapsed);
        setPhase("done");
        if (!best || elapsed < best) {
          setBest(elapsed);
          localStorage.setItem("lockin.warmup.colorconnect.best", String(elapsed));
        }
      }
    } else {
      // wrong match — flash error on tapped dot, clear selection
      setErrorIdx(index);
      setSelected(null);
      setTimeout(() => setErrorIdx(null), 400);
    }
  }

  return (
    <div>
      <div className="card-surface relative aspect-square max-h-80 mx-auto overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {pairs.map((pair, i) => {
            if (!matched.has(pair.a) || !matched.has(pair.b)) return null;
            const p1 = positions[pair.a];
            const p2 = positions[pair.b];
            const color = PAIR_COLORS[pair.colorIdx % PAIR_COLORS.length];
            return (
              <line
                key={`pair-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity={0.9}
              />
            );
          })}
        </svg>
        {positions.map((p, i) => {
          const pair = pairs.find((p2) => p2.a === i || p2.b === i);
          const color = pair ? PAIR_COLORS[pair.colorIdx % PAIR_COLORS.length] : "#94a3b8";
          const isMatched = matched.has(i);
          const isSelected = selected === i;
          const isError = errorIdx === i;

          return (
            <button
              key={i}
              onClick={() => tap(i)}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: color,
                opacity: isMatched ? 0.55 : 1,
              }}
              className={`absolute w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                isMatched
                  ? "ring-2 ring-white/30 scale-90"
                  : isError
                    ? "ring-2 ring-destructive scale-110"
                    : isSelected
                      ? "ring-2 ring-primary scale-110 animate-pulse"
                      : "ring-2 ring-white/20 hover:scale-105"
              }`}
            />
          );
        })}
        {phase === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80">
            <button onClick={start} className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium">
              Start
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Matched" value={`${matched.size / 2}/10`} />
        <Stat label="Time" value={time ? `${time} ms` : "—"} />
        <Stat label="Best" value={best ? `${best} ms` : "—"} />
      </div>
      {phase === "done" && (
        <div className="mt-3 text-center">
          <button onClick={start} className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium">
            <RotateCcw className="inline size-4 mr-1" /> Play again
          </button>
        </div>
      )}
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

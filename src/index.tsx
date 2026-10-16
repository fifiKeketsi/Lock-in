import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Sparkles, Trophy, Flame, ArrowRight, Clock, Users, HeartHandshake } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { TaskBoard } from "@/components/TaskBoard";
import { VirtualPet } from "@/components/VirtualPet";
import { useLockIn } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lock-In · The Top AI Study & Focus Platform" },
      { name: "description", content: "Lock-In transforms your study workflow with Pomodoro timers, real-time peer focus rooms, an AI companion, and task management." },
      { property: "og:title", content: "Lock-In · The Top AI Study & Focus Platform" },
      { property: "og:description", content: "Beat procrastination with focus sessions, a virtual companion, and real-time study rooms." },
    ],
  }),
  component: Home,
});

const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "Small steps every day beat heroic effort once a week.",
  "Future you is watching. Make them proud.",
  "Focus is a superpower. Train it daily.",
  "The secret of getting ahead is getting started.",
];

function Home() {
  const { state } = useLockIn();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const completedToday = state.tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-8">
        {/* StudyFetch Signature Hero Section */}
        <section className="relative py-4 md:py-8">
          <div className="relative max-w-3xl space-y-5">
            {/* Modality Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="sfb-badge-lemon inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="size-3" /> Focus System
              </span>
              <span className="sfb-badge-lime inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Users className="size-3" /> P2P Study Rooms
              </span>
              <span className="sfb-badge-pink inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <HeartHandshake className="size-3" /> AI Companion
              </span>
            </div>

            {/* Headline with Editorial Serif Accent */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]">
              Stop scrolling.<br />
              <span className="font-editorial italic font-normal text-muted-foreground">Start locking in.</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed pt-1">
              Lock-In is the all-in-one focus workspace. Break down assignments, sync timers in real-time study rooms with friends, and raise your focus companion with every minute studied.
            </p>

            {/* Pill CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <Link
                to="/focus"
                className="sfb-btn-primary flex items-center gap-2 text-sm font-semibold"
              >
                <span>Start Focus Session</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/rooms"
                className="sfb-btn-secondary flex items-center gap-2 text-sm font-semibold"
              >
                <Users className="size-4" />
                <span>Join Study Room</span>
              </Link>
              <Link
                to="/warmup"
                className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Brain Warm-up
              </Link>
            </div>
          </div>
        </section>

        {/* StudyFetch Bento Stat Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Flame className="size-4" />}
            label="Day streak"
            value={`${state.streak} days`}
            badgeClass="sfb-badge-lemon"
          />
          <StatCard
            icon={<Sparkles className="size-4" />}
            label="Focus Points"
            value={state.points}
            badgeClass="sfb-badge-pink"
          />
          <StatCard
            icon={<Trophy className="size-4" />}
            label="Badges Earned"
            value={state.badges.length}
            badgeClass="sfb-badge-lime"
          />
          <StatCard
            icon={<Clock className="size-4" />}
            label="Tasks Done Today"
            value={completedToday}
            badgeClass="sfb-badge-teal"
          />
        </section>

        {/* Main Content Bento Grid */}
        <section className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: TaskBoard & Daily Nudge */}
          <div className="lg:col-span-2 space-y-6">
            <TaskBoard />

            {/* StudyFetch Editorial Quote Card */}
            <div className="sfb-card p-6 flex items-start gap-4">
              <div className="size-11 rounded-2xl sfb-badge-peach flex items-center justify-center shrink-0">
                <Quote className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Daily Spark
                </div>
                <div className="font-editorial italic text-xl md:text-2xl text-foreground leading-snug">
                  "{quote}"
                </div>
              </div>
            </div>

            {/* Badges Collection */}
            {state.badges.length > 0 && (
              <div className="sfb-card p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-foreground">Your Achievements</h3>
                  <span className="text-xs font-semibold text-muted-foreground">{state.badges.length} unlocked</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {state.badges.map((b) => (
                    <span
                      key={b}
                      className="sfb-badge-lime inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    >
                      <Trophy className="size-3.5" /> {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: VirtualPet & Live Study Room Callout */}
          <div className="space-y-6">
            <VirtualPet />

            {/* StudyFetch Live Rooms Card */}
            <div className="sfb-card p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="sfb-badge-teal text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Users className="size-3" /> Live Mesh
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16a34a]">
                  <span className="size-2 rounded-full bg-[#22c55e] animate-pulse" />
                  Instant WebRTC
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Study Together Live</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Create a focus room, share the invite code with a friend, and study with live video, mic, chat, and concurrent timers.
                </p>
              </div>

              <div className="pt-1">
                <Link
                  to="/rooms"
                  className="w-full sfb-btn-primary flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <span>Explore Focus Rooms</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Mindful Check-in Prompt */}
            <div className="sfb-card p-6 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">Daily Reflection</div>
                <div className="text-xs text-muted-foreground">Log your mood & focus energy</div>
              </div>
              <Link
                to="/checkin"
                className="sfb-btn-secondary text-xs px-3.5 py-1.5 shrink-0"
              >
                Reflect
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  badgeClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  badgeClass: string;
}) {
  return (
    <div className="sfb-card p-5 space-y-3">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeClass}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

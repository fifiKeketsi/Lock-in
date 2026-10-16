import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppNav } from "@/components/AppNav";
import { createRoom, listRooms, deleteRoom, getMe, saveMe, type Room } from "@/lib/rooms";
import { useLockIn } from "@/lib/store";
import { Users, Plus, Trash2, ArrowRight, Lock, Video } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/rooms/")({
  head: () => ({
    meta: [
      { title: "Study Rooms · Lock-In" },
      { name: "description", content: "Invite friends to live study sessions with video, audio, chat, and concurrent timers." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { state } = useLockIn();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(() => listRooms());
  const [name, setName] = useState("");
  const [me, setMe] = useState(() => getMe(state.user));
  const [creating, setCreating] = useState(false);

  const refresh = () => setRooms(listRooms());

  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "rooms"),
        (snap) => {
          const live: Room[] = snap.docs.map((d) => d.data() as Room);
          if (live.length > 0) {
            setRooms(live.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
          }
        },
        (err) => {
          console.warn("Rooms live list warning:", err);
        }
      );
      return () => unsub();
    } catch {}
  }, []);

  const onCreate = async () => {
    if (!state.user) {
      alert("Please log in or register an account to create a room.");
      return;
    }
    setCreating(true);
    try {
      const r = await createRoom(name.trim() || "Focus Study Room", state.user);
      setName("");
      refresh();
      navigate({ to: "/rooms/$roomId", params: { roomId: r.id } });
    } catch (err) {
      console.warn("Create room error:", err);
      window.location.href = `/rooms/ROOM${Date.now().toString(36).slice(-4).toUpperCase()}`;
    } finally {
      setCreating(false);
    }
  };

  const updateMe = (patch: Partial<typeof me>) => {
    const next = { ...me, ...patch };
    setMe(next);
    saveMe(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-8">
        {!state.user && (
          <div className="rounded-3xl bg-[#fff5ec] dark:bg-[#391f0c] border border-[#ffaa6b]/50 p-4 text-[#4a1d00] dark:text-[#ffca98] flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-[#ffca98] text-[#4a1d00] flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </div>
              <div>
                <div className="font-display font-bold text-sm">Account Required to Host Rooms</div>
                <div className="text-xs text-[#4a1d00]/80 dark:text-[#ffca98]/80">Create an account to host persistent rooms and save your study history.</div>
              </div>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <Link to="/login" className="px-4 py-1.5 rounded-full bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919]">Log In</Link>
              <Link to="/register" className="px-4 py-1.5 rounded-full border border-[#ffaa6b] bg-white/50 dark:bg-black/20">Register</Link>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="space-y-3">
          <span className="sfb-badge-teal text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
            <Video className="size-3" /> Live Mesh Network
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Lock in together.<br />
            <span className="font-editorial italic font-normal text-muted-foreground">Study rooms with live video & chat.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Create an invite link, share it with friends or classmates, and hold each other accountable with synchronized Pomodoro timers and live WebRTC audio/video.
          </p>
        </header>

        {/* Profile Card */}
        <section className="sfb-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">Your Room Profile</h2>
            <span className="text-[11px] text-muted-foreground">Appears in participant video slots</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={me.emoji}
              onChange={(e) => updateMe({ emoji: e.target.value.slice(0, 2) })}
              className="size-11 rounded-2xl border border-border bg-card text-center text-xl focus:outline-none focus:ring-1 focus:ring-foreground"
              aria-label="Your emoji avatar"
            />
            <input
              value={me.name}
              onChange={(e) => updateMe({ name: e.target.value.slice(0, 24) })}
              placeholder="Your display name"
              className="flex-1 min-w-[200px] h-11 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </section>

        {/* Start a New Room Card */}
        <section className="sfb-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">Start a Study Room</h2>
            <span className="sfb-badge-lemon text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">Instant</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MCAT Prep / Late Night Calculus"
              className="flex-1 min-w-[240px] h-11 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              onKeyDown={(e) => e.key === "Enter" && !creating && onCreate()}
              disabled={creating}
            />
            <button
              onClick={onCreate}
              disabled={creating}
              className="sfb-btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-6"
            >
              <Plus className="size-4" /> {creating ? "Setting up mesh…" : "Create Room"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            A unique shareable link will be generated. Anyone with the link can join live.
          </p>
        </section>

        {/* Existing Rooms Bento Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">Your Focus Rooms</h2>
            <span className="text-xs text-muted-foreground">{rooms.length} available</span>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-3xl bg-secondary/20 space-y-1">
              <Users className="size-6 mx-auto text-muted-foreground opacity-60 mb-2" />
              <p className="text-xs font-bold text-foreground">No focus rooms yet</p>
              <p className="text-[11px] text-muted-foreground">Create your first room above to lock in with friends.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="sfb-card p-5 flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-display font-bold text-sm text-foreground truncate">{r.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="sfb-badge-lemon text-[10px] font-bold px-2 py-0.2 rounded-full">
                        #{r.id}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(r.members || []).length} joined
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: r.id }}
                      className="sfb-btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1"
                    >
                      <span>Enter</span>
                      <ArrowRight className="size-3" />
                    </Link>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete room "${r.name}"?`)) {
                          await deleteRoom(r.id);
                          refresh();
                        }
                      }}
                      className="size-8 rounded-full text-muted-foreground hover:text-[#dc2626] hover:bg-destructive/10 flex items-center justify-center transition-colors"
                      aria-label="Delete room"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

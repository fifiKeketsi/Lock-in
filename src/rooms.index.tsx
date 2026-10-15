import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { createRoom, listRooms, deleteRoom, getMe, saveMe } from "@/lib/rooms";
import { useLockIn } from "@/lib/store";
import { Users, Plus, Trash2, ArrowRight, Lock } from "lucide-react";

export const Route = createFileRoute("/rooms/")({
  head: () => ({
    meta: [
      { title: "Focus Rooms · Lock-In" },
      { name: "description", content: "Invite friends to focus sessions, chat and hold each other accountable." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { state } = useLockIn();
  const [rooms, setRooms] = useState(() => listRooms());
  const [name, setName] = useState("");
  const [me, setMe] = useState(() => getMe(state.user));

  const refresh = () => setRooms(listRooms());

  const onCreate = () => {
    if (!state.user) {
      alert("Please log in or register an account to create a room.");
      return;
    }
    const r = createRoom(name.trim() || "Focus Room");
    setName("");
    refresh();
    window.location.href = `/rooms/${r.id}`;
  };

  const updateMe = (patch: Partial<typeof me>) => {
    const next = { ...me, ...patch };
    setMe(next);
    saveMe(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {!state.user && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Lock className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Account Required for Focus Rooms</div>
                <div className="text-xs opacity-90">Only registered users with an account can create or join shared focus rooms.</div>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <Link to="/login" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium">Log In</Link>
              <Link to="/register" className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium">Register</Link>
            </div>
          </div>
        )}

        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            <Users className="size-3.5" /> Focus Rooms
          </div>
          <h1 className="font-display text-3xl font-semibold">Lock in together</h1>
          <p className="text-muted-foreground max-w-2xl">
            Create a room, share the link with a friend, and hold each other accountable. Only people
            you share the link with who have an account can join.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
          <h2 className="font-display text-lg font-semibold">Your profile</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={me.emoji}
              onChange={(e) => updateMe({ emoji: e.target.value.slice(0, 2) })}
              className="w-14 h-11 rounded-lg border border-input bg-background text-center text-xl"
              aria-label="Your emoji"
            />
            <input
              value={me.name}
              onChange={(e) => updateMe({ name: e.target.value.slice(0, 24) })}
              placeholder="Your name"
              className="flex-1 min-w-[180px] h-11 rounded-lg border border-input bg-background px-3"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
          <h2 className="font-display text-lg font-semibold">Start a new room</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Room name (e.g. Bio study session)"
              className="flex-1 min-w-[220px] h-11 rounded-lg border border-input bg-background px-3"
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
            />
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-lg focus-gradient px-4 py-2 text-primary-foreground shadow-soft hover:opacity-95"
            >
              <Plus className="size-4" /> Create room
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            A shareable link is created. Anyone with the link can join and chat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Your rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-6 text-center">
              No rooms yet. Create one above to get started.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.members.length} member{r.members.length === 1 ? "" : "s"} · #{r.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: r.id }}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80"
                    >
                      Enter <ArrowRight className="size-3.5" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete room "${r.name}"?`)) {
                          deleteRoom(r.id);
                          refresh();
                        }
                      }}
                      className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"
                      aria-label="Delete room"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

       
      
      </main>
    </div>
  );
}

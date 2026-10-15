import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { VideoRoom } from "@/components/VideoRoom";
import { ensureRoomFromLink, useRoom } from "@/lib/rooms";
import { useLockIn } from "@/lib/store";
import { Copy, Send, Play, Square, ArrowLeft, Target, Lock } from "lucide-react";

export const Route = createFileRoute("/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Focus Room · Lock-In" },
      { name: "description", content: "Join a shared focus session with friends." },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const { state } = useLockIn();

  // Ensure a placeholder room exists locally if opened via link.
  useEffect(() => {
    ensureRoomFromLink(roomId);
  }, [roomId]);

  const { room, me, join, leave, sendMessage, setGoal, startTimer, stopTimer, toggleCamera, toggleMic } = useRoom(roomId, state.user);
  const [goalInput, setGoalInput] = useState("");
  const [msg, setMsg] = useState("");
  const [duration, setDuration] = useState(25);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const iAmIn = !!room?.members.find((m) => m.id === me.id);
  const myGoal = room?.members.find((m) => m.id === me.id)?.goal ?? "";

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [room?.messages.length]);

  const remaining = useMemo(() => {
    if (!room?.timer.running || !room.timer.startedAt) return null;
    const end = new Date(room.timer.startedAt).getTime() + room.timer.durationMin * 60_000;
    return Math.max(0, end - Date.now());
  }, [room?.timer]);

  const [, force] = useState(0);
  useEffect(() => {
    if (!room?.timer.running) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [room?.timer.running]);

  const liveRemaining = room?.timer.running && room.timer.startedAt
    ? Math.max(0, new Date(room.timer.startedAt).getTime() + room.timer.durationMin * 60_000 - Date.now())
    : remaining;

  const mm = liveRemaining != null ? String(Math.floor(liveRemaining / 60000)).padStart(2, "0") : "--";
  const ss = liveRemaining != null ? String(Math.floor((liveRemaining % 60000) / 1000)).padStart(2, "0") : "--";

  const copyLink = async () => {
    const url = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied! Share it with a friend.");
    } catch {
      prompt("Copy this link:", url);
    }
  };

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
                Account Required
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This focus room is private. Only users with a registered Lock-In account can join rooms created via shared link.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center py-3 rounded-xl focus-gradient text-primary-foreground font-semibold shadow-soft hover:opacity-90 transition"
              >
                Log In to Join Room
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

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading room…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All rooms
          </Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80"
          >
            <Copy className="size-4" /> Copy invite link
          </button>
        </div>

        <header className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Room #{room.id}</div>
              <h1 className="font-display text-2xl font-semibold">{room.name}</h1>
              <p className="text-sm text-muted-foreground">
                {room.members.length} member{room.members.length === 1 ? "" : "s"} in this room
              </p>
            </div>

            <div className="rounded-xl bg-secondary/50 px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground">Group timer</div>
              <div className="font-display text-3xl tabular-nums">
                {mm}:{ss}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                {room.timer.running ? (
                  <button
                    onClick={stopTimer}
                    className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground"
                  >
                    <Square className="size-3" /> Stop
                  </button>
                ) : (
                  <>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-14 h-7 rounded-md border border-input bg-background px-2 text-xs"
                    />
                    <button
                      onClick={() => startTimer(duration)}
                      className="inline-flex items-center gap-1 rounded-md focus-gradient px-2 py-1 text-xs text-primary-foreground"
                    >
                      <Play className="size-3" /> Start
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Video Room Section */}
        {iAmIn && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="font-display text-lg font-semibold mb-4">Video Call</h2>
            <VideoRoom
              roomId={roomId}
              members={room.members}
              currentUserId={me.id}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMic}
            />
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          {/* Members / goals */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Target className="size-4" /> Today's goals
            </h2>

            {!iAmIn ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  What will you work on this session?
                </label>
                <textarea
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  rows={2}
                  placeholder="e.g. Finish chapter 4 problems, review flashcards"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => join(goalInput.trim() || "Locking in")}
                  className="w-full inline-flex items-center justify-center rounded-lg focus-gradient px-3 py-2 text-sm text-primary-foreground shadow-soft"
                >
                  Join room as {me.emoji} {me.name}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Your goal</label>
                <div className="flex gap-2">
                  <input
                    defaultValue={myGoal}
                    key={myGoal}
                    onBlur={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setGoal((e.target as HTMLInputElement).value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={leave}
                  className="w-full text-xs text-muted-foreground hover:text-destructive"
                >
                  Leave room
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-2">
              {room.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has joined yet.</p>
              ) : (
                room.members.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg bg-secondary/40 p-2">
                    <div className="text-2xl leading-none">{m.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {m.name}
                        {m.id === me.id && <span className="text-xs text-muted-foreground"> (you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">
                        {m.goal || "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Chat */}
          <section className="rounded-2xl border border-border bg-card shadow-soft flex flex-col overflow-hidden" style={{ minHeight: 420 }}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Chat</h2>
            </div>
            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 520 }}>
              {room.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Say hi and share what you're working on today.
                </p>
              ) : (
                room.messages.map((m) => {
                  const mine = m.memberId === me.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                      {!mine && <div className="text-xl leading-none pt-1">{m.emoji}</div>}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? "focus-gradient text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {!mine && <div className="text-xs opacity-70 mb-0.5">{m.name}</div>}
                        <div className="break-words whitespace-pre-wrap">{m.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!iAmIn) {
                  alert("Join the room first to send messages.");
                  return;
                }
                sendMessage(msg);
                setMsg("");
              }}
              className="border-t border-border p-3 flex gap-2"
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={iAmIn ? "Message the room…" : "Join to chat"}
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg focus-gradient px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={!iAmIn || !msg.trim()}
              >
                <Send className="size-4" />
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { VideoRoom } from "@/components/VideoRoom";
import { ensureRoomFromLink, useRoom } from "@/lib/rooms";
import { useLockIn } from "@/lib/store";
import { Copy, Send, Play, Square, ArrowLeft, Target, Users } from "lucide-react";

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

  // Ensure room exists in Firestore and locally when opened
  useEffect(() => {
    if (roomId) {
      ensureRoomFromLink(roomId, undefined, state.user);
    }
  }, [roomId, state.user]);

  const [guestName, setGuestName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("lockin.guest_name") || "";
  });
  const [hasJoinedGuest, setHasJoinedGuest] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(sessionStorage.getItem(`lockin.joined.${roomId}`));
  });

  const {
    room,
    me,
    firestoreError,
    sendMessage,
    setGoal,
    updateProfile,
    leave,
    startTimer,
    stopTimer,
    toggleCamera,
    toggleMic,
  } = useRoom(roomId, state.user);

  const [msg, setMsg] = useState("");
  const [duration, setDuration] = useState(25);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const myGoal = room?.members.find((m) => m.id === me.id)?.goal ?? "";

  const handleGuestJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = guestName.trim() || `Friend ${me.id.slice(-4)}`;
    localStorage.setItem("lockin.guest_name", finalName);
    sessionStorage.setItem(`lockin.joined.${roomId}`, "true");
    updateProfile(finalName);
    setHasJoinedGuest(true);
  };

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

  const liveRemaining =
    room?.timer.running && room.timer.startedAt
      ? Math.max(0, new Date(room.timer.startedAt).getTime() + room.timer.durationMin * 60_000 - Date.now())
      : remaining;

  const mm = liveRemaining != null ? String(Math.floor(liveRemaining / 60000)).padStart(2, "0") : "--";
  const ss = liveRemaining != null ? String(Math.floor((liveRemaining % 60000) / 1000)).padStart(2, "0") : "--";

  const copyLink = async () => {
    const url = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Room link copied! Share this link with your friends to lock in together.");
    } catch {
      prompt("Copy this link:", url);
    }
  };

  // If user is not logged in and has not yet confirmed their guest name
  if (!state.user && !hasJoinedGuest) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-soft text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Users className="size-8" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                Focus Session #{roomId}
              </div>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Join Study Room
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You've been invited to lock in together! Enter your display name to join the live audio, video, and chat.
              </p>
            </div>

            <form onSubmit={handleGuestJoin} className="space-y-4 pt-2">
              <div className="text-left space-y-1.5">
                <label className="text-xs font-medium text-foreground">Your display name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Maya or Alex"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center py-3 rounded-xl focus-gradient text-primary-foreground font-semibold shadow-soft hover:opacity-90 transition"
              >
                Join Focus Room
              </button>
            </form>

            <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Have an account?</span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in to track points
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
          <div className="animate-pulse space-y-2">
            <Users className="size-8 mx-auto text-primary opacity-60" />
            <p className="text-muted-foreground">Connecting to room #{roomId}…</p>
          </div>
        </main>
      </div>
    );
  }

  const memberCount = room.members.length;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {/* Navigation & Share */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/rooms"
            onClick={leave}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All rooms
          </Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-lg focus-gradient px-3.5 py-1.5 text-sm text-primary-foreground font-medium shadow-soft hover:opacity-90 transition"
          >
            <Copy className="size-4" /> Copy invite link
          </button>
        </div>

        {/* Firestore Setup Diagnostic Banner */}
        {firestoreError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft">
            <div className="space-y-0.5">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span>⚠️ Firebase Cloud Firestore Database Not Created</span>
              </div>
              <p className="text-xs text-muted-foreground dark:text-amber-300/80 leading-relaxed">
                To sync rooms with friends on other computers, open your Firebase console and click <strong>Create database</strong> (choose Test Mode). Testing between tabs on this computer is fully functional right now.
              </p>
            </div>
            <a
              href="https://console.firebase.google.com/project/my-app-1510c/firestore"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-sm shrink-0"
            >
              Enable in Firebase Console
            </a>
          </div>
        )}

        {/* Room Header with Live Status & Timer */}
        <header className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Room #{room.id}</div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{room.name}</h1>
              
              {/* Live Member Count with pulsing indicator */}
              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-foreground">
                  {memberCount} {memberCount === 1 ? "member in this room" : "members online now"}
                </span>
                {memberCount === 1 && (
                  <span className="text-xs text-muted-foreground">
                    (Share the invite link to bring your friend in!)
                  </span>
                )}
              </div>
            </div>

            {/* Synchronized Group Focus Timer */}
            <div className="rounded-xl bg-secondary/50 px-4 py-3 text-center border border-border/50">
              <div className="text-xs text-muted-foreground font-medium">Group timer</div>
              <div className="font-display text-3xl tabular-nums font-bold">
                {mm}:{ss}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                {room.timer.running ? (
                  <button
                    onClick={stopTimer}
                    className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition"
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
                      className="w-14 h-7 rounded-md border border-input bg-background px-2 text-xs text-center"
                      title="Timer duration in minutes"
                    />
                    <button
                      onClick={() => startTimer(duration)}
                      className="inline-flex items-center gap-1 rounded-md focus-gradient px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                    >
                      <Play className="size-3" /> Start
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Video Call Section - Always rendered and synced */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <span>Video & Audio Call</span>
              {memberCount > 1 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live with friends
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-secondary">
                  Waiting for friends
                </span>
              )}
            </h2>
            <div className="text-xs text-muted-foreground">
              {memberCount} active slot{memberCount === 1 ? "" : "s"}
            </div>
          </div>

          <VideoRoom
            roomId={roomId}
            members={room.members}
            currentUserId={me.id}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
          />
        </section>

        {/* Goals & Chat Grid */}
        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          {/* Members / Goals */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Target className="size-4 text-primary" /> Session Goals
              </h2>
              <span className="text-xs text-muted-foreground">{memberCount} in room</span>
            </div>

            {/* Quick goal editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Your focus goal</label>
              <input
                defaultValue={myGoal}
                key={myGoal}
                placeholder="What are you locking in on? (Press Enter to save)"
                onBlur={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setGoal((e.target as HTMLInputElement).value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Live member list */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Participants ({memberCount})</div>
              {room.members.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/40">
                  <div className="text-2xl leading-none">{m.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.id === me.id && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground break-words mt-0.5">
                      {m.goal || "Focusing quietly"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Real-Time Live Chat */}
          <section className="rounded-2xl border border-border bg-card shadow-soft flex flex-col overflow-hidden" style={{ minHeight: 420 }}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Live Room Chat</h2>
              <span className="text-xs text-muted-foreground">{room.messages.length} messages</span>
            </div>

            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ maxHeight: 520 }}>
              {room.messages.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                  <p className="text-sm font-medium text-foreground">Welcome to the room!</p>
                  <p className="text-xs text-muted-foreground">
                    Say hello to your friends and share what you're working on.
                  </p>
                </div>
              ) : (
                room.messages.map((m) => {
                  const mine = m.memberId === me.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                      {!mine && <div className="text-xl leading-none pt-1">{m.emoji}</div>}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          mine
                            ? "focus-gradient text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {!mine && <div className="text-xs opacity-75 font-medium mb-0.5">{m.name}</div>}
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
                if (!msg.trim()) return;
                sendMessage(msg);
                setMsg("");
              }}
              className="border-t border-border p-3 flex gap-2 bg-background/50"
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type a message to the room…"
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg focus-gradient px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-soft hover:opacity-90 transition"
                disabled={!msg.trim()}
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

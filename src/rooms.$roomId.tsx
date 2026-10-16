import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { VideoRoom } from "@/components/VideoRoom";
import { ensureRoomFromLink, useRoom } from "@/lib/rooms";
import { useLockIn } from "@/lib/store";
import { Copy, Send, Play, Square, ArrowLeft, Target, Users, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Focus Room · Lock-In" },
      { name: "description", content: "Join a shared peer-to-peer study session with friends." },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const { state } = useLockIn();
  const [copied, setCopied] = useState(false);

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
    trysteroRoom,
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copy this link:", url);
    }
  };

  // Guest Join Screen with StudyFetch card styling
  if (!state.user && !hasJoinedGuest) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md sfb-card p-8 md:p-10 text-center space-y-6">
            <div className="mx-auto size-16 rounded-3xl sfb-badge-teal flex items-center justify-center text-foreground">
              <Users className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="sfb-badge-lemon text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Room #{roomId}
              </span>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Join Focus Room
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                You've been invited to lock in! Enter your name to join live WebRTC video, mic, chat, and concurrent timer.
              </p>
            </div>

            <form onSubmit={handleGuestJoin} className="space-y-3.5 pt-1">
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your display name (e.g. Maya)"
                className="w-full h-11 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                autoFocus
              />

              <button
                type="submit"
                className="w-full sfb-btn-primary py-3 text-xs font-semibold"
              >
                Enter Study Room
              </button>
            </form>

            <div className="pt-2 border-t border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span>Have an account?</span>
              <Link to="/login" className="font-semibold text-foreground underline hover:opacity-80">
                Log in
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
        <main className="mx-auto max-w-4xl px-4 py-16 text-center space-y-3">
          <div className="size-12 rounded-full bg-secondary mx-auto flex items-center justify-center animate-spin text-muted-foreground">
            <Users className="size-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Connecting to WebRTC study mesh for #{roomId}…</p>
        </main>
      </div>
    );
  }

  const memberCount = room.members.length;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6">
        {/* Top Floating Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/rooms"
            onClick={leave}
            className="sfb-btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5"
          >
            <ArrowLeft className="size-3.5" /> All Study Rooms
          </Link>
          <button
            onClick={copyLink}
            className="sfb-btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-4"
          >
            {copied ? <Check className="size-3.5 text-[#22c55e]" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
          </button>
        </div>

        {/* Room Header with StudyFetch Bento Styling */}
        <header className="sfb-card p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="sfb-badge-lemon text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Room #{room.id}
                </span>
                <span className="sfb-badge-teal text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  WebRTC Mesh
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {room.name}
              </h1>
              
              {/* Live Member Status Indicator */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-[#16a34a]"></span>
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {memberCount} {memberCount === 1 ? "member in this room" : "members online now"}
                </span>
                {memberCount === 1 && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    · Send the invite link to a study buddy!
                  </span>
                )}
              </div>
            </div>

            {/* Concurrent Group Timer Widget */}
            <div className="rounded-3xl bg-[#f7f6ef] dark:bg-[#191919] border border-border p-4 text-center min-w-[200px] shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-0.5">
                Concurrent Timer
              </div>
              <div className="font-display text-3xl md:text-4xl tabular-nums font-bold text-foreground">
                {mm}:{ss}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {room.timer.running ? (
                  <button
                    onClick={stopTimer}
                    className="sfb-btn-secondary inline-flex items-center gap-1 text-xs py-1 px-3 text-[#dc2626]"
                  >
                    <Square className="size-3" /> Stop Timer
                  </button>
                ) : (
                  <>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-13 h-7 rounded-full border border-border bg-card px-2 text-xs text-center font-bold"
                      title="Timer duration"
                    />
                    <button
                      onClick={() => startTimer(duration)}
                      className="sfb-btn-primary inline-flex items-center gap-1 text-xs py-1 px-3.5"
                    >
                      <Play className="size-3" /> Start
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Video Call Grid Section */}
        <section className="sfb-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="sfb-badge-lime text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Users className="size-2.5" /> Peer Mesh
              </span>
              <h2 className="font-display text-base font-bold text-foreground">Live Video & Microphone</h2>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {memberCount} active slot{memberCount === 1 ? "" : "s"}
            </span>
          </div>

          <VideoRoom
            roomId={roomId}
            members={room.members}
            currentUserId={me.id}
            trysteroRoom={trysteroRoom}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
          />
        </section>

        {/* Session Goals & Live Chat Grid */}
        <div className="grid gap-6 md:grid-cols-[1fr_1.35fr]">
          {/* Goals & Participant Column */}
          <section className="sfb-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="sfb-badge-peach text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Target className="size-2.5" /> Goals
                </span>
                <h2 className="font-display text-base font-bold text-foreground">Focus Target</h2>
              </div>
              <span className="text-xs text-muted-foreground">{memberCount} in room</span>
            </div>

            {/* Personal Goal Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Your Session Goal</label>
              <input
                defaultValue={myGoal}
                key={myGoal}
                placeholder="What are you locking in on? (Press Enter)"
                onBlur={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setGoal((e.target as HTMLInputElement).value)}
                className="w-full h-10 rounded-full border border-border bg-card px-4 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>

            {/* Participants Roster */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Classmates ({memberCount})
              </div>
              <div className="space-y-2">
                {room.members.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-3 border border-border/50">
                    <div className="text-2xl leading-none">{m.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.id === me.id && <span className="text-[10px] text-muted-foreground font-normal">(you)</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground break-words mt-0.5">
                        {m.goal || "Focusing quietly"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Real-Time Live Chat Sidebar */}
          <section className="sfb-card shadow-card flex flex-col overflow-hidden" style={{ minHeight: 420 }}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-foreground">Room Chat</h2>
              <span className="text-[11px] font-semibold text-muted-foreground">{room.messages.length} messages</span>
            </div>

            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 460 }}>
              {room.messages.length === 0 ? (
                <div className="text-center py-14 space-y-1">
                  <Sparkles className="size-5 mx-auto text-muted-foreground opacity-60 mb-2" />
                  <p className="text-xs font-bold text-foreground">Room chat is active</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Type a message below to coordinate with your study partners.
                  </p>
                </div>
              ) : (
                room.messages.map((m) => {
                  const mine = m.memberId === me.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
                      {!mine && <div className="text-xl leading-none pt-0.5">{m.emoji}</div>}
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2 text-xs shadow-xs ${
                          mine
                            ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919]"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {!mine && <div className="text-[10px] font-bold opacity-75 mb-0.5">{m.name}</div>}
                        <div className="break-words whitespace-pre-wrap leading-relaxed">{m.text}</div>
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
              className="border-t border-border p-3 flex items-center gap-2 bg-card"
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type a message to room…"
                className="flex-1 h-9.5 rounded-full border border-border bg-background px-4 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <button
                type="submit"
                className="size-9 rounded-full bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition"
                disabled={!msg.trim()}
                aria-label="Send message"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

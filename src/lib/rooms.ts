import { useEffect, useState, useCallback, useRef } from "react";

export interface RoomMember {
  id: string;
  name: string;
  emoji: string;
  goal: string;
  joinedAt: string;
  lastSeen: string;
  cameraOn: boolean;
  micOn: boolean;
}

export interface RoomMessage {
  id: string;
  memberId: string;
  name: string;
  emoji: string;
  text: string;
  at: string;
}

export interface RoomTimer {
  running: boolean;
  startedAt?: string;
  durationMin: number;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
  members: RoomMember[];
  messages: RoomMessage[];
  timer: RoomTimer;
}

const ROOMS_KEY = "lockin.rooms.v1";
const ME_KEY = "lockin.rooms.me.v1";

export interface MeProfile {
  id: string;
  name: string;
  emoji: string;
}

export const EMOJIS = ["🦊", "🐻", "🐼", "🐸", "🦉", "🐙", "🦄", "🐧", "🐨", "🐯", "🦁", "🐰"];

function loadRooms(): Record<string, Room> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ROOMS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRooms(r: Record<string, Room>) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(r));
}

export function getMe(authUser?: { id: string; name: string; email: string } | null): MeProfile {
  if (typeof window === "undefined") {
    return { id: "anon", name: "Guest", emoji: "🦊" };
  }

  let savedEmoji = EMOJIS[0];
  try {
    const saved = localStorage.getItem(ME_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.emoji) savedEmoji = parsed.emoji;
    }
  } catch {
    // ignore
  }

  if (authUser) {
    const me: MeProfile = {
      id: authUser.id,
      name: authUser.name || authUser.email.split("@")[0] || "Member",
      emoji: savedEmoji,
    };
    saveMe(me);
    return me;
  }

  return {
    id: "anon",
    name: "Guest",
    emoji: savedEmoji,
  };
}

export function saveMe(me: MeProfile) {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

export function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(name: string): Room {
  const rooms = loadRooms();
  const room: Room = {
    id: generateRoomId(),
    name: name || "Focus Room",
    createdAt: new Date().toISOString(),
    members: [],
    messages: [],
    timer: { running: false, durationMin: 25 },
  };
  rooms[room.id] = room;
  saveRooms(rooms);
  return room;
}

export function listRooms(): Room[] {
  return Object.values(loadRooms()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteRoom(id: string) {
  const rooms = loadRooms();
  delete rooms[id];
  saveRooms(rooms);
  broadcast(id);
}

const channels = new Map<string, BroadcastChannel>();
function getChannel(roomId: string): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  let ch = channels.get(roomId);
  if (!ch) {
    ch = new BroadcastChannel(`lockin-room-${roomId}`);
    channels.set(roomId, ch);
  }
  return ch;
}

function broadcast(roomId: string) {
  getChannel(roomId)?.postMessage({ type: "update", at: Date.now() });
}

export function useRoom(
  roomId: string | undefined,
  authUser?: { id: string; name: string; email: string } | null
) {
  const [room, setRoom] = useState<Room | null>(null);
  const me = getMe(authUser);
  const meRef = useRef<MeProfile>(me);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const refresh = useCallback(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }
    const rooms = loadRooms();
    const room = rooms[roomId];
    if (room) {
      setRoom({
        ...room,
        members: room.members.map((m) => ({
          ...m,
          cameraOn: m.cameraOn ?? false,
          micOn: m.micOn ?? false,
        })),
      });
    } else {
      setRoom(null);
    }
  }, [roomId]);

  useEffect(() => {
    refresh();
    if (!roomId) return;
    const ch = getChannel(roomId);
    const onMsg = () => refresh();
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === ROOMS_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      window.removeEventListener("storage", onStorage);
    };
  }, [roomId, refresh]);

  const update = useCallback(
    (mut: (r: Room) => Room) => {
      if (!roomId) return;
      const rooms = loadRooms();
      const cur = rooms[roomId];
      if (!cur) return;
      rooms[roomId] = mut(cur);
      saveRooms(rooms);
      broadcast(roomId);
      setRoom(rooms[roomId]);
    },
    [roomId]
  );

  const join = useCallback(
    (goal: string) => {
      const currentMe = meRef.current;
      update((r) => {
        const now = new Date().toISOString();
        const existing = r.members.find((m) => m.id === currentMe.id);
        const members = existing
          ? r.members.map((m) =>
              m.id === currentMe.id
                ? {
                    ...m,
                    name: currentMe.name,
                    emoji: currentMe.emoji,
                    goal,
                    lastSeen: now,
                    cameraOn: m.cameraOn ?? false,
                    micOn: m.micOn ?? false,
                  }
                : m
            )
          : [
              ...r.members.map((m) => ({
                ...m,
                cameraOn: m.cameraOn ?? false,
                micOn: m.micOn ?? false,
              })),
              {
                id: currentMe.id,
                name: currentMe.name,
                emoji: currentMe.emoji,
                goal,
                joinedAt: now,
                lastSeen: now,
                cameraOn: false,
                micOn: false,
              },
            ];
        return { ...r, members };
      });
    },
    [update]
  );

  const toggleCamera = useCallback(() => {
    const currentMe = meRef.current;
    update((r) => ({
      ...r,
      members: r.members.map((m) =>
        m.id === currentMe.id
          ? { ...m, cameraOn: !(m.cameraOn ?? false) }
          : { ...m, cameraOn: m.cameraOn ?? false, micOn: m.micOn ?? false }
      ),
    }));
  }, [update]);

  const toggleMic = useCallback(() => {
    const currentMe = meRef.current;
    update((r) => ({
      ...r,
      members: r.members.map((m) =>
        m.id === currentMe.id
          ? { ...m, micOn: !(m.micOn ?? false) }
          : { ...m, cameraOn: m.cameraOn ?? false, micOn: m.micOn ?? false }
      ),
    }));
  }, [update]);

  const leave = useCallback(() => {
    const currentMe = meRef.current;
    update((r) => ({ ...r, members: r.members.filter((m) => m.id !== currentMe.id) }));
  }, [update]);

  const sendMessage = useCallback(
    (text: string) => {
      const currentMe = meRef.current;
      if (!text.trim()) return;
      update((r) => ({
        ...r,
        messages: [
          ...r.messages,
          {
            id: Math.random().toString(36).slice(2),
            memberId: currentMe.id,
            name: currentMe.name,
            emoji: currentMe.emoji,
            text: text.trim(),
            at: new Date().toISOString(),
          },
        ].slice(-200),
      }));
    },
    [update]
  );

  const setGoal = useCallback(
    (goal: string) => {
      const currentMe = meRef.current;
      update((r) => ({
        ...r,
        members: r.members.map((m) => (m.id === currentMe.id ? { ...m, goal } : m)),
      }));
    },
    [update]
  );

  const startTimer = useCallback(
    (durationMin: number) => {
      update((r) => ({
        ...r,
        timer: { running: true, startedAt: new Date().toISOString(), durationMin },
      }));
    },
    [update]
  );

  const stopTimer = useCallback(() => {
    update((r) => ({ ...r, timer: { ...r.timer, running: false, startedAt: undefined } }));
  }, [update]);

  return {
    room,
    me,
    join,
    leave,
    sendMessage,
    setGoal,
    startTimer,
    stopTimer,
    refresh,
    toggleCamera,
    toggleMic,
  };
}

export function ensureRoomFromLink(id: string, name?: string): Room {
  const rooms = loadRooms();
  if (!rooms[id]) {
    rooms[id] = {
      id,
      name: name || "Shared Room",
      createdAt: new Date().toISOString(),
      members: [],
      messages: [],
      timer: { running: false, durationMin: 25 },
    };
    saveRooms(rooms);
  }
  return rooms[id];
}

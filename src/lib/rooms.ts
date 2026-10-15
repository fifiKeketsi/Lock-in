import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

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
  creatorId?: string;
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

function loadLocalRooms(): Record<string, Room> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ROOMS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalRooms(r: Record<string, Room>) {
  if (typeof window === "undefined") return;
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
  if (typeof window === "undefined") return;
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

export function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createRoom(
  name: string,
  authUser?: { id: string; name: string; email: string } | null
): Promise<Room> {
  const me = getMe(authUser);
  const roomId = generateRoomId();
  const newRoom: Room = {
    id: roomId,
    name: name || "Focus Room",
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members: [
      {
        id: me.id,
        name: me.name,
        emoji: me.emoji,
        goal: "Focusing",
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        cameraOn: false,
        micOn: true,
      },
    ],
    messages: [],
    timer: { running: false, durationMin: 25 },
  };

  // Cache locally
  const local = loadLocalRooms();
  local[roomId] = newRoom;
  saveLocalRooms(local);

  // Sync to Firestore
  try {
    await setDoc(doc(db, "rooms", roomId), {
      id: newRoom.id,
      name: newRoom.name,
      createdAt: newRoom.createdAt,
      creatorId: newRoom.creatorId,
      members: newRoom.members,
      timer: newRoom.timer,
    });
  } catch (err) {
    console.warn("Firestore createRoom fallback:", err);
  }

  return newRoom;
}

export function listRooms(): Room[] {
  return Object.values(loadLocalRooms()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRoom(id: string) {
  const rooms = loadLocalRooms();
  delete rooms[id];
  saveLocalRooms(rooms);
  try {
    await deleteDoc(doc(db, "rooms", id));
  } catch (err) {
    console.warn("Error deleting room in Firestore:", err);
  }
}

export async function ensureRoomFromLink(
  id: string,
  name?: string,
  authUser?: { id: string; name: string; email: string } | null
): Promise<Room> {
  const me = getMe(authUser);
  const local = loadLocalRooms();
  if (local[id]) return local[id];

  // Try checking Firestore
  try {
    const snap = await getDoc(doc(db, "rooms", id));
    if (snap.exists()) {
      const data = snap.data() as Room;
      local[id] = { ...data, messages: [] };
      saveLocalRooms(local);
      return local[id];
    }
  } catch (err) {
    console.warn("Firestore check room fallback:", err);
  }

  // Create room placeholder
  const placeholder: Room = {
    id,
    name: name || `Focus Room #${id}`,
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members: [],
    messages: [],
    timer: { running: false, durationMin: 25 },
  };
  local[id] = placeholder;
  saveLocalRooms(local);

  try {
    await setDoc(
      doc(db, "rooms", id),
      {
        id,
        name: placeholder.name,
        createdAt: placeholder.createdAt,
        creatorId: placeholder.creatorId,
        members: placeholder.members,
        timer: placeholder.timer,
      },
      { merge: true }
    );
  } catch {
    // Ignore
  }

  return placeholder;
}

export function useRoom(
  roomId: string | undefined,
  authUser?: { id: string; name: string; email: string } | null
) {
  const me = getMe(authUser);
  const meRef = useRef<MeProfile>(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const [room, setRoom] = useState<Room | null>(() => {
    if (!roomId) return null;
    return loadLocalRooms()[roomId] || null;
  });

  const [messages, setMessages] = useState<RoomMessage[]>([]);

  // 1. Listen for real-time room metadata & members from Firestore
  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, "rooms", roomId);
    const unsubscribeRoom = onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const updatedRoom: Room = {
            id: roomId,
            name: data.name || "Focus Room",
            createdAt: data.createdAt || new Date().toISOString(),
            creatorId: data.creatorId,
            members: (data.members || []).map((m: any) => ({
              id: m.id,
              name: m.name,
              emoji: m.emoji || "🦊",
              goal: m.goal || "",
              joinedAt: m.joinedAt || new Date().toISOString(),
              lastSeen: m.lastSeen || new Date().toISOString(),
              cameraOn: Boolean(m.cameraOn),
              micOn: Boolean(m.micOn),
            })),
            messages: [],
            timer: data.timer || { running: false, durationMin: 25 },
          };

          setRoom(updatedRoom);

          // Update local cache
          const local = loadLocalRooms();
          local[roomId] = updatedRoom;
          saveLocalRooms(local);
        }
      },
      (error) => {
        console.warn("Firestore room snapshot error:", error);
      }
    );

    // 2. Listen for real-time live chat messages
    const msgQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("at", "asc"));
    const unsubscribeMessages = onSnapshot(
      msgQuery,
      (querySnap) => {
        const msgs: RoomMessage[] = querySnap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            memberId: d.memberId,
            name: d.name,
            emoji: d.emoji || "🦊",
            text: d.text,
            at: d.at || new Date().toISOString(),
          };
        });
        setMessages(msgs);
      },
      (error) => {
        console.warn("Firestore messages snapshot error:", error);
      }
    );

    return () => {
      unsubscribeRoom();
      unsubscribeMessages();
    };
  }, [roomId]);

  // Combined room object with messages
  const currentRoom: Room | null = room
    ? {
        ...room,
        messages,
      }
    : null;

  // Sync update helper to Firestore
  const updateFirestore = useCallback(
    async (patch: Partial<Room>) => {
      if (!roomId) return;
      try {
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, patch);
      } catch (err) {
        console.warn("Firestore update error:", err);
      }
    },
    [roomId]
  );

  const join = useCallback(
    async (goal: string) => {
      if (!roomId) return;
      const currentMe = meRef.current;
      const now = new Date().toISOString();

      setRoom((prev) => {
        if (!prev) return prev;
        const exists = prev.members.some((m) => m.id === currentMe.id);
        const members: RoomMember[] = exists
          ? prev.members.map((m) =>
              m.id === currentMe.id
                ? { ...m, name: currentMe.name, emoji: currentMe.emoji, goal, lastSeen: now }
                : m
            )
          : [
              ...prev.members,
              {
                id: currentMe.id,
                name: currentMe.name,
                emoji: currentMe.emoji,
                goal,
                joinedAt: now,
                lastSeen: now,
                cameraOn: false,
                micOn: true,
              },
            ];

        // Sync to Firestore
        updateFirestore({ members });
        return { ...prev, members };
      });
    },
    [roomId, updateFirestore]
  );

  const leave = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;

    setRoom((prev) => {
      if (!prev) return prev;
      const members = prev.members.filter((m) => m.id !== currentMe.id);
      updateFirestore({ members });
      return { ...prev, members };
    });
  }, [roomId, updateFirestore]);

  const toggleCamera = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;

    setRoom((prev) => {
      if (!prev) return prev;
      const members = prev.members.map((m) =>
        m.id === currentMe.id ? { ...m, cameraOn: !m.cameraOn } : m
      );
      updateFirestore({ members });
      return { ...prev, members };
    });
  }, [roomId, updateFirestore]);

  const toggleMic = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;

    setRoom((prev) => {
      if (!prev) return prev;
      const members = prev.members.map((m) =>
        m.id === currentMe.id ? { ...m, micOn: !m.micOn } : m
      );
      updateFirestore({ members });
      return { ...prev, members };
    });
  }, [roomId, updateFirestore]);

  const setGoal = useCallback(
    async (goal: string) => {
      if (!roomId) return;
      const currentMe = meRef.current;

      setRoom((prev) => {
        if (!prev) return prev;
        const members = prev.members.map((m) =>
          m.id === currentMe.id ? { ...m, goal } : m
        );
        updateFirestore({ members });
        return { ...prev, members };
      });
    },
    [roomId, updateFirestore]
  );

  const startTimer = useCallback(
    async (durationMin: number) => {
      const timer = {
        running: true,
        startedAt: new Date().toISOString(),
        durationMin,
      };
      setRoom((prev) => (prev ? { ...prev, timer } : prev));
      updateFirestore({ timer });
    },
    [updateFirestore]
  );

  const stopTimer = useCallback(async () => {
    const timer = { running: false, durationMin: 25 };
    setRoom((prev) => (prev ? { ...prev, timer } : prev));
    updateFirestore({ timer });
  }, [updateFirestore]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!roomId || !text.trim()) return;
      const currentMe = meRef.current;

      const newMsg: RoomMessage = {
        id: crypto.randomUUID(),
        memberId: currentMe.id,
        name: currentMe.name,
        emoji: currentMe.emoji,
        text: text.trim(),
        at: new Date().toISOString(),
      };

      // Optimistically add to local messages
      setMessages((prev) => [...prev, newMsg]);

      // Write to Firestore messages subcollection
      try {
        await addDoc(collection(db, "rooms", roomId, "messages"), {
          memberId: currentMe.id,
          name: currentMe.name,
          emoji: currentMe.emoji,
          text: text.trim(),
          at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Firestore send message error:", err);
      }
    },
    [roomId]
  );

  return {
    room: currentRoom,
    me,
    join,
    leave,
    sendMessage,
    setGoal,
    startTimer,
    stopTimer,
    toggleCamera,
    toggleMic,
  };
}

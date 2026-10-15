import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
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
    await setDoc(
      doc(db, "rooms", roomId),
      {
        id: newRoom.id,
        name: newRoom.name,
        createdAt: newRoom.createdAt,
        creatorId: newRoom.creatorId,
        members: newRoom.members,
        timer: newRoom.timer,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Firestore createRoom error:", err);
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

  try {
    const snap = await getDoc(doc(db, "rooms", id));
    if (snap.exists()) {
      const data = snap.data() as Room;
      local[id] = { ...data, messages: [] };
      saveLocalRooms(local);
      return local[id];
    }
  } catch (err) {
    console.warn("Firestore check room error:", err);
  }

  // Create room placeholder in Firestore if not present
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
  } catch (err) {
    console.warn("Firestore ensureRoom error:", err);
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

  // Real-time Firestore room listener + AUTO-JOIN presence
  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, "rooms", roomId);
    let isSubscribed = true;

    // 1. Auto-join user to room.members in Firestore so they immediately appear in slots & count
    const autoJoin = async () => {
      try {
        const docSnap = await getDoc(roomRef);
        const currentMe = meRef.current;
        const now = new Date().toISOString();

        const myMemberEntry: RoomMember = {
          id: currentMe.id,
          name: currentMe.name,
          emoji: currentMe.emoji,
          goal: "Focusing",
          joinedAt: now,
          lastSeen: now,
          cameraOn: false,
          micOn: true,
        };

        if (docSnap.exists()) {
          const data = docSnap.data();
          const existingMembers: RoomMember[] = data.members || [];
          // Replace or add current user
          const updated = [
            ...existingMembers.filter((m) => m.id !== currentMe.id),
            myMemberEntry,
          ];
          await setDoc(roomRef, { members: updated }, { merge: true });
        } else {
          // If room doc hasn't been created yet, initialize it with current user
          await setDoc(
            roomRef,
            {
              id: roomId,
              name: `Focus Room #${roomId}`,
              createdAt: now,
              creatorId: currentMe.id,
              members: [myMemberEntry],
              timer: { running: false, durationMin: 25 },
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn("Auto-join error:", err);
      }
    };

    autoJoin();

    // 2. Real-time snapshot listener for members, timer, and room details
    const unsubscribeRoom = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!isSubscribed) return;
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

    // 3. Real-time live chat listener
    const msgQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("at", "asc"));
    const unsubscribeMessages = onSnapshot(
      msgQuery,
      (querySnap) => {
        if (!isSubscribed) return;
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

    // 4. Presence cleanup on tab close / unmount
    const handleLeave = () => {
      try {
        const currentMe = meRef.current;
        getDoc(roomRef).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const remaining = (data.members || []).filter((m: any) => m.id !== currentMe.id);
            setDoc(roomRef, { members: remaining }, { merge: true });
          }
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleLeave);

    return () => {
      isSubscribed = false;
      unsubscribeRoom();
      unsubscribeMessages();
      window.removeEventListener("beforeunload", handleLeave);
      handleLeave();
    };
  }, [roomId]);

  const currentRoom: Room | null = room
    ? {
        ...room,
        messages,
      }
    : null;

  // Sync changes directly to Firestore with merge: true
  const updateFirestore = useCallback(
    async (patch: Partial<Room>) => {
      if (!roomId) return;
      try {
        const roomRef = doc(db, "rooms", roomId);
        await setDoc(roomRef, patch, { merge: true });
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

      try {
        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        const existingMembers: RoomMember[] = snap.exists() ? snap.data().members || [] : [];
        const updated = [
          ...existingMembers.filter((m) => m.id !== currentMe.id),
          {
            id: currentMe.id,
            name: currentMe.name,
            emoji: currentMe.emoji,
            goal: goal || "Focusing",
            joinedAt: now,
            lastSeen: now,
            cameraOn: false,
            micOn: true,
          },
        ];
        await setDoc(roomRef, { members: updated }, { merge: true });
      } catch (e) {
        console.warn("Join error:", e);
      }
    },
    [roomId]
  );

  const leave = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const updated = (snap.data().members || []).filter((m: any) => m.id !== currentMe.id);
        await setDoc(roomRef, { members: updated }, { merge: true });
      }
    } catch (e) {
      console.warn("Leave error:", e);
    }
  }, [roomId]);

  const toggleCamera = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const updated = (snap.data().members || []).map((m: any) =>
          m.id === currentMe.id ? { ...m, cameraOn: !m.cameraOn } : m
        );
        await setDoc(roomRef, { members: updated }, { merge: true });
      }
    } catch (e) {
      console.warn("Toggle camera error:", e);
    }
  }, [roomId]);

  const toggleMic = useCallback(async () => {
    if (!roomId) return;
    const currentMe = meRef.current;
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const updated = (snap.data().members || []).map((m: any) =>
          m.id === currentMe.id ? { ...m, micOn: !m.micOn } : m
        );
        await setDoc(roomRef, { members: updated }, { merge: true });
      }
    } catch (e) {
      console.warn("Toggle mic error:", e);
    }
  }, [roomId]);

  const setGoal = useCallback(
    async (goal: string) => {
      if (!roomId) return;
      const currentMe = meRef.current;
      try {
        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const updated = (snap.data().members || []).map((m: any) =>
            m.id === currentMe.id ? { ...m, goal } : m
          );
          await setDoc(roomRef, { members: updated }, { merge: true });
        }
      } catch (e) {
        console.warn("Set goal error:", e);
      }
    },
    [roomId]
  );

  const startTimer = useCallback(
    async (durationMin: number) => {
      const timer = {
        running: true,
        startedAt: new Date().toISOString(),
        durationMin,
      };
      await updateFirestore({ timer });
    },
    [updateFirestore]
  );

  const stopTimer = useCallback(async () => {
    const timer = { running: false, durationMin: 25 };
    await updateFirestore({ timer });
  }, [updateFirestore]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!roomId || !text.trim()) return;
      const currentMe = meRef.current;

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

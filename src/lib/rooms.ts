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
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(r));
  } catch {
    // Ignore quota errors
  }
}

export function getMe(authUser?: { id: string; name: string; email: string } | null): MeProfile {
  if (typeof window === "undefined") {
    return { id: "anon", name: "Guest", emoji: "🦊" };
  }

  // Pick random emoji once per device if not yet set
  let savedEmoji = "";
  let savedGuestName = "";
  try {
    const saved = localStorage.getItem(ME_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.emoji) savedEmoji = parsed.emoji;
      if (parsed.name) savedGuestName = parsed.name;
    }
    const guestName = localStorage.getItem("lockin.guest_name");
    if (guestName) savedGuestName = guestName;
  } catch {
    // ignore
  }

  if (!savedEmoji) {
    savedEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  }

  // Create a persistent unique session ID for this browser tab/device
  const userId = authUser ? authUser.id : "guest";
  const sidKey = `lockin.sid.v3.${userId}`;
  let sid = sessionStorage.getItem(sidKey);
  if (!sid) {
    sid = `${userId}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(sidKey, sid);
  }

  const name = authUser
    ? authUser.name || authUser.email.split("@")[0] || "Member"
    : savedGuestName || `Friend ${sid.slice(-4)}`;

  const me: MeProfile = {
    id: sid,
    name,
    emoji: savedEmoji,
  };
  saveMe(me);
  return me;
}

export function saveMe(me: MeProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {
    // ignore
  }
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
        lastSeen: String(Date.now()),
        cameraOn: false,
        micOn: true,
      },
    ],
    messages: [],
    timer: { running: false, durationMin: 25 },
  };

  // 1. Immediately cache locally
  const local = loadLocalRooms();
  local[roomId] = newRoom;
  saveLocalRooms(local);

  // 2. Non-blocking Firestore save
  Promise.race([
    setDoc(
      doc(db, "rooms", roomId),
      {
        id: newRoom.id,
        name: newRoom.name,
        createdAt: newRoom.createdAt,
        creatorId: newRoom.creatorId,
        timer: newRoom.timer,
      },
      { merge: true }
    ),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => {});

  return newRoom;
}

export function listRooms(): Room[] {
  return Object.values(loadLocalRooms()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteRoom(id: string) {
  const rooms = loadLocalRooms();
  delete rooms[id];
  saveLocalRooms(rooms);
  try {
    deleteDoc(doc(db, "rooms", id)).catch(() => {});
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
    const snap: any = await Promise.race([
      getDoc(doc(db, "rooms", id)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
    ]);
    if (snap && snap.exists()) {
      const data = snap.data() as Room;
      local[id] = { ...data, members: local[id]?.members || [], messages: [] };
      saveLocalRooms(local);
      return local[id];
    }
  } catch (err) {
    console.warn("Firestore check room warning:", err);
  }

  const placeholder: Room = local[id] || {
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

  Promise.race([
    setDoc(
      doc(db, "rooms", id),
      {
        id,
        name: placeholder.name,
        createdAt: placeholder.createdAt,
        creatorId: placeholder.creatorId,
        timer: placeholder.timer,
      },
      { merge: true }
    ),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => {});

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

  const [roomData, setRoomData] = useState<{ id: string; name: string; timer: RoomTimer } | null>(() => {
    if (!roomId) return null;
    const l = loadLocalRooms()[roomId];
    if (!l) return null;
    return { id: l.id, name: l.name, timer: l.timer };
  });

  const [members, setMembers] = useState<RoomMember[]>([
    {
      id: me.id,
      name: me.name,
      emoji: me.emoji,
      goal: "Focusing",
      joinedAt: new Date().toISOString(),
      lastSeen: String(Date.now()),
      cameraOn: false,
      micOn: true,
    },
  ]);

  const [messages, setMessages] = useState<RoomMessage[]>([]);

  // Real-time Firestore Room Sync with Independent Participants Collection
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    const roomRef = doc(db, "rooms", roomId);
    const participantRef = doc(db, "rooms", roomId, "participants", me.id);

    // 1. Ensure room document exists
    setDoc(
      roomRef,
      {
        id: roomId,
        name: `Focus Room #${roomId}`,
        timer: { running: false, durationMin: 25 },
      },
      { merge: true }
    ).catch(() => {});

    // 2. Register current user in the real-time participants subcollection
    const registerPresence = async () => {
      const currentMe = meRef.current;
      try {
        const snap = await getDoc(participantRef);
        if (!snap.exists()) {
          await setDoc(participantRef, {
            id: currentMe.id,
            name: currentMe.name,
            emoji: currentMe.emoji,
            goal: "Focusing",
            cameraOn: false,
            micOn: true,
            lastSeen: Date.now(),
            joinedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(
            participantRef,
            {
              id: currentMe.id,
              name: currentMe.name,
              emoji: currentMe.emoji,
              lastSeen: Date.now(),
            },
            { merge: true }
          );
        }
      } catch {
        setDoc(
          participantRef,
          {
            id: currentMe.id,
            name: currentMe.name,
            emoji: currentMe.emoji,
            lastSeen: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }
    };

    registerPresence();

    // 3. Heartbeat every 10 seconds to keep presence fresh
    const heartbeat = setInterval(() => {
      setDoc(participantRef, { lastSeen: Date.now() }, { merge: true }).catch(() => {});
    }, 10000);

    // 4. Listen for real-time participants subcollection
    const unsubParticipants = onSnapshot(
      collection(db, "rooms", roomId, "participants"),
      (snapshot) => {
        if (!isMounted) return;
        const now = Date.now();
        const active: RoomMember[] = [];

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const isMe = docSnap.id === me.id;
          // Tolerate up to 2 minutes clock differences or brief network hiccups
          const isFresh = d.lastSeen && Math.abs(now - Number(d.lastSeen)) < 120000;

          if (isMe || isFresh) {
            active.push({
              id: docSnap.id,
              name: d.name || "Member",
              emoji: d.emoji || "🦊",
              goal: d.goal || "Focusing",
              joinedAt: d.joinedAt || new Date().toISOString(),
              lastSeen: String(d.lastSeen || Date.now()),
              cameraOn: Boolean(d.cameraOn),
              micOn: Boolean(d.micOn),
            });
          }
        });

        // Always ensure self is in the members list
        if (!active.some((m) => m.id === me.id)) {
          active.unshift({
            id: me.id,
            name: me.name,
            emoji: me.emoji,
            goal: "Focusing",
            joinedAt: new Date().toISOString(),
            lastSeen: String(Date.now()),
            cameraOn: false,
            micOn: true,
          });
        }

        setMembers(active);
      },
      (err) => {
        console.warn("Participants snapshot error:", err);
      }
    );

    // 5. Listen for room metadata & timer
    const unsubRoom = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const d = docSnap.data();
          setRoomData({
            id: roomId,
            name: d.name || `Focus Room #${roomId}`,
            timer: d.timer || { running: false, durationMin: 25 },
          });
        }
      },
      (err) => {
        console.warn("Room doc snapshot error:", err);
      }
    );

    // 6. Listen for live room messages
    const msgQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("at", "asc"));
    const unsubMessages = onSnapshot(
      msgQuery,
      (querySnap) => {
        if (!isMounted) return;
        const msgs: RoomMessage[] = querySnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            memberId: data.memberId,
            name: data.name,
            emoji: data.emoji || "🦊",
            text: data.text,
            at: data.at || new Date().toISOString(),
          };
        });
        setMessages(msgs);
      },
      (err) => {
        console.warn("Messages snapshot error:", err);
      }
    );

    // 7. Cleanup only when closing browser window
    const onBeforeUnload = () => {
      deleteDoc(participantRef).catch(() => {});
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(heartbeat);
      unsubParticipants();
      unsubRoom();
      unsubMessages();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [roomId, me.id]);

  // Combined room object
  const room: Room = {
    id: roomId || "room",
    name: roomData?.name || `Focus Room #${roomId}`,
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members,
    messages,
    timer: roomData?.timer || { running: false, durationMin: 25 },
  };

  const toggleCamera = useCallback(async () => {
    if (!roomId) return;
    const participantRef = doc(db, "rooms", roomId, "participants", me.id);
    const currentMember = members.find((m) => m.id === me.id);
    const nextState = !(currentMember?.cameraOn ?? false);
    setDoc(participantRef, { cameraOn: nextState, lastSeen: Date.now() }, { merge: true }).catch(() => {});
  }, [roomId, me.id, members]);

  const toggleMic = useCallback(async () => {
    if (!roomId) return;
    const participantRef = doc(db, "rooms", roomId, "participants", me.id);
    const currentMember = members.find((m) => m.id === me.id);
    const nextState = !(currentMember?.micOn ?? true);
    setDoc(participantRef, { micOn: nextState, lastSeen: Date.now() }, { merge: true }).catch(() => {});
  }, [roomId, me.id, members]);

  const setGoal = useCallback(
    async (goal: string) => {
      if (!roomId) return;
      const participantRef = doc(db, "rooms", roomId, "participants", me.id);
      setDoc(participantRef, { goal, lastSeen: Date.now() }, { merge: true }).catch(() => {});
    },
    [roomId, me.id]
  );

  const updateProfile = useCallback(
    async (name: string, emoji?: string) => {
      if (!roomId) return;
      const participantRef = doc(db, "rooms", roomId, "participants", me.id);
      const updates: any = { name, lastSeen: Date.now() };
      if (emoji) updates.emoji = emoji;

      const newMe = { ...me, name, emoji: emoji || me.emoji };
      saveMe(newMe);
      if (typeof window !== "undefined") {
        localStorage.setItem("lockin.guest_name", name);
      }
      setDoc(participantRef, updates, { merge: true }).catch(() => {});
    },
    [roomId, me]
  );

  const leave = useCallback(async () => {
    if (!roomId) return;
    try {
      const participantRef = doc(db, "rooms", roomId, "participants", me.id);
      await deleteDoc(participantRef);
    } catch {
      // ignore
    }
  }, [roomId, me.id]);

  const startTimer = useCallback(
    async (durationMin: number) => {
      if (!roomId) return;
      const roomRef = doc(db, "rooms", roomId);
      setDoc(
        roomRef,
        {
          timer: { running: true, startedAt: new Date().toISOString(), durationMin },
        },
        { merge: true }
      ).catch(() => {});
    },
    [roomId]
  );

  const stopTimer = useCallback(async () => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);
    setDoc(
      roomRef,
      {
        timer: { running: false, durationMin: 25 },
      },
      { merge: true }
    ).catch(() => {});
  }, [roomId]);

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
        console.warn("Firestore send message warning:", err);
      }
    },
    [roomId]
  );

  return {
    room,
    me,
    sendMessage,
    setGoal,
    updateProfile,
    leave,
    startTimer,
    stopTimer,
    toggleCamera,
    toggleMic,
  };
}

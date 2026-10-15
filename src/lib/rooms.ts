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
  const sidKey = `lockin.sid.v4.${userId}`;
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

  const [firestoreError, setFirestoreError] = useState(false);

  // Timer & Room metadata
  const [roomData, setRoomData] = useState<{ id: string; name: string; timer: RoomTimer }>(() => {
    if (!roomId) return { id: "room", name: "Focus Room", timer: { running: false, durationMin: 25 } };
    const l = loadLocalRooms()[roomId];
    return {
      id: roomId,
      name: l?.name || `Focus Room #${roomId}`,
      timer: l?.timer || { running: false, durationMin: 25 },
    };
  });

  // Active participants map (keyed by participant ID)
  const [activeMembersMap, setActiveMembersMap] = useState<Record<string, RoomMember>>(() => ({
    [me.id]: {
      id: me.id,
      name: me.name,
      emoji: me.emoji,
      goal: "Focusing",
      joinedAt: new Date().toISOString(),
      lastSeen: String(Date.now()),
      cameraOn: false,
      micOn: true,
    },
  }));

  const [messages, setMessages] = useState<RoomMessage[]>([]);

  // Dual-Layer Room Sync Engine: BroadcastChannel (Instant Local) + Cloud Firestore (Cross-Device)
  useEffect(() => {
    if (!roomId || typeof window === "undefined") return;

    let isMounted = true;
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_room_${roomId}`) : null;

    const myCurrentMember = (): RoomMember => {
      const currentMe = meRef.current;
      const currentLocal = activeMembersMap[currentMe.id];
      return {
        id: currentMe.id,
        name: currentMe.name,
        emoji: currentMe.emoji,
        goal: currentLocal?.goal || "Focusing",
        joinedAt: currentLocal?.joinedAt || new Date().toISOString(),
        lastSeen: String(Date.now()),
        cameraOn: currentLocal?.cameraOn ?? false,
        micOn: currentLocal?.micOn ?? true,
      };
    };

    // 1. Listen on BroadcastChannel for instant inter-tab/window communication
    const handleBroadcast = (e: MessageEvent) => {
      if (!isMounted || !e.data) return;
      const data = e.data;

      if (data.type === "PRESENCE_PING") {
        if (data.member && data.member.id !== me.id) {
          setActiveMembersMap((prev) => ({
            ...prev,
            [data.member.id]: { ...data.member, lastSeen: String(Date.now()) },
          }));
          // Reply with PONG so the new peer immediately discovers us
          bc?.postMessage({
            type: "PRESENCE_PONG",
            member: myCurrentMember(),
          });
        }
      } else if (data.type === "PRESENCE_PONG") {
        if (data.member && data.member.id !== me.id) {
          setActiveMembersMap((prev) => ({
            ...prev,
            [data.member.id]: { ...data.member, lastSeen: String(Date.now()) },
          }));
        }
      } else if (data.type === "PRESENCE_LEAVE") {
        if (data.memberId && data.memberId !== me.id) {
          setActiveMembersMap((prev) => {
            const next = { ...prev };
            delete next[data.memberId];
            return next;
          });
        }
      } else if (data.type === "MEMBER_PATCH") {
        if (data.memberId) {
          setActiveMembersMap((prev) => {
            if (!prev[data.memberId]) return prev;
            return {
              ...prev,
              [data.memberId]: {
                ...prev[data.memberId],
                ...data.patch,
                lastSeen: String(Date.now()),
              },
            };
          });
        }
      } else if (data.type === "TIMER_UPDATE") {
        if (data.timer) {
          setRoomData((prev) => ({ ...prev, timer: data.timer }));
        }
      } else if (data.type === "CHAT_MESSAGE") {
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      }
    };

    bc?.addEventListener("message", handleBroadcast);

    // Broadcast our presence immediately upon entering
    bc?.postMessage({
      type: "PRESENCE_PING",
      member: myCurrentMember(),
    });

    // Broadcast heartbeat every 5 seconds to keep peers updated
    const heartbeat = setInterval(() => {
      bc?.postMessage({
        type: "PRESENCE_PING",
        member: myCurrentMember(),
      });

      // Filter out stale disconnects older than 30 seconds (except self)
      const now = Date.now();
      setActiveMembersMap((prev) => {
        let changed = false;
        const next: Record<string, RoomMember> = {};
        Object.entries(prev).forEach(([id, member]) => {
          if (id === me.id || now - Number(member.lastSeen || 0) < 30000) {
            next[id] = member;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    // 2. Cloud Firestore Real-time Sync (for cross-device / internet peers)
    const roomRef = doc(db, "rooms", roomId);
    const participantRef = doc(db, "rooms", roomId, "participants", me.id);

    // Register room & participant in Firestore
    setDoc(
      roomRef,
      { id: roomId, name: `Focus Room #${roomId}` },
      { merge: true }
    ).catch((err: any) => {
      if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
        setFirestoreError(true);
      }
    });

    setDoc(participantRef, myCurrentMember(), { merge: true }).catch((err: any) => {
      if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
        setFirestoreError(true);
      }
    });

    // Firestore participant heartbeat every 10 seconds
    const fsHeartbeat = setInterval(() => {
      setDoc(participantRef, { lastSeen: Date.now() }, { merge: true }).catch((err: any) => {
        if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
          setFirestoreError(true);
        }
      });
    }, 10000);

    // Listen to Firestore participants subcollection
    const unsubParticipants = onSnapshot(
      collection(db, "rooms", roomId, "participants"),
      (snapshot) => {
        if (!isMounted) return;
        setFirestoreError(false);
        const now = Date.now();
        setActiveMembersMap((prev) => {
          const next = { ...prev };
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const isMe = docSnap.id === me.id;
            const isFresh = d.lastSeen && Math.abs(now - Number(d.lastSeen)) < 120000;
            if (isMe || isFresh) {
              next[docSnap.id] = {
                id: docSnap.id,
                name: d.name || "Member",
                emoji: d.emoji || "🦊",
                goal: d.goal || "Focusing",
                joinedAt: d.joinedAt || new Date().toISOString(),
                lastSeen: String(d.lastSeen || Date.now()),
                cameraOn: Boolean(d.cameraOn),
                micOn: Boolean(d.micOn),
              };
            }
          });
          return next;
        });
      },
      (err) => {
        if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
          setFirestoreError(true);
        }
      }
    );

    // Listen to Firestore room metadata (timer)
    const unsubRoom = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!isMounted) return;
        setFirestoreError(false);
        if (docSnap.exists()) {
          const d = docSnap.data();
          if (d.timer) {
            setRoomData((prev) => ({
              ...prev,
              name: d.name || prev.name,
              timer: d.timer,
            }));
          }
        }
      },
      (err) => {
        if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
          setFirestoreError(true);
        }
      }
    );

    // Listen to Firestore chat messages
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
        if (err?.code === "not-found" || err?.message?.includes("NOT_FOUND")) {
          setFirestoreError(true);
        }
      }
    );

    // Cleanup when closing tab
    const onBeforeUnload = () => {
      try {
        bc?.postMessage({ type: "PRESENCE_LEAVE", memberId: me.id });
      } catch {}
      deleteDoc(participantRef).catch(() => {});
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(heartbeat);
      clearInterval(fsHeartbeat);
      bc?.removeEventListener("message", handleBroadcast);
      bc?.close();
      unsubParticipants();
      unsubRoom();
      unsubMessages();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [roomId, me.id]);

  // Combined room object
  const room: Room = {
    id: roomId || "room",
    name: roomData.name,
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members: Object.values(activeMembersMap),
    messages,
    timer: roomData.timer,
  };

  const toggleCamera = useCallback(() => {
    if (!roomId) return;
    setActiveMembersMap((prev) => {
      const current = prev[me.id];
      const nextCam = !(current?.cameraOn ?? false);
      const updated = {
        ...(current || {
          id: me.id,
          name: me.name,
          emoji: me.emoji,
          goal: "Focusing",
          joinedAt: new Date().toISOString(),
          micOn: true,
        }),
        cameraOn: nextCam,
        lastSeen: String(Date.now()),
      };

      try {
        const bc = new BroadcastChannel(`lockin_room_${roomId}`);
        bc.postMessage({
          type: "MEMBER_PATCH",
          memberId: me.id,
          patch: { cameraOn: nextCam },
        });
        bc.close();
      } catch {}

      setDoc(
        doc(db, "rooms", roomId, "participants", me.id),
        { cameraOn: nextCam, lastSeen: Date.now() },
        { merge: true }
      ).catch(() => {});

      return { ...prev, [me.id]: updated };
    });
  }, [roomId, me]);

  const toggleMic = useCallback(() => {
    if (!roomId) return;
    setActiveMembersMap((prev) => {
      const current = prev[me.id];
      const nextMic = !(current?.micOn ?? true);
      const updated = {
        ...(current || {
          id: me.id,
          name: me.name,
          emoji: me.emoji,
          goal: "Focusing",
          joinedAt: new Date().toISOString(),
          cameraOn: false,
        }),
        micOn: nextMic,
        lastSeen: String(Date.now()),
      };

      try {
        const bc = new BroadcastChannel(`lockin_room_${roomId}`);
        bc.postMessage({
          type: "MEMBER_PATCH",
          memberId: me.id,
          patch: { micOn: nextMic },
        });
        bc.close();
      } catch {}

      setDoc(
        doc(db, "rooms", roomId, "participants", me.id),
        { micOn: nextMic, lastSeen: Date.now() },
        { merge: true }
      ).catch(() => {});

      return { ...prev, [me.id]: updated };
    });
  }, [roomId, me]);

  const setGoal = useCallback(
    (goal: string) => {
      if (!roomId) return;
      setActiveMembersMap((prev) => {
        const current = prev[me.id];
        const updated = {
          ...(current || {
            id: me.id,
            name: me.name,
            emoji: me.emoji,
            cameraOn: false,
            micOn: true,
            joinedAt: new Date().toISOString(),
          }),
          goal,
          lastSeen: String(Date.now()),
        };

        try {
          const bc = new BroadcastChannel(`lockin_room_${roomId}`);
          bc.postMessage({
            type: "MEMBER_PATCH",
            memberId: me.id,
            patch: { goal },
          });
          bc.close();
        } catch {}

        setDoc(
          doc(db, "rooms", roomId, "participants", me.id),
          { goal, lastSeen: Date.now() },
          { merge: true }
        ).catch(() => {});

        return { ...prev, [me.id]: updated };
      });
    },
    [roomId, me]
  );

  const updateProfile = useCallback(
    (name: string, emoji?: string) => {
      if (!roomId) return;
      const newEmoji = emoji || me.emoji;
      setActiveMembersMap((prev) => {
        const current = prev[me.id];
        const updated = {
          ...(current || {
            id: me.id,
            goal: "Focusing",
            cameraOn: false,
            micOn: true,
            joinedAt: new Date().toISOString(),
          }),
          name,
          emoji: newEmoji,
          lastSeen: String(Date.now()),
        };

        try {
          const bc = new BroadcastChannel(`lockin_room_${roomId}`);
          bc.postMessage({
            type: "MEMBER_PATCH",
            memberId: me.id,
            patch: { name, emoji: newEmoji },
          });
          bc.close();
        } catch {}

        setDoc(
          doc(db, "rooms", roomId, "participants", me.id),
          { name, emoji: newEmoji, lastSeen: Date.now() },
          { merge: true }
        ).catch(() => {});

        return { ...prev, [me.id]: updated };
      });

      const newMe = { ...me, name, emoji: newEmoji };
      saveMe(newMe);
      if (typeof window !== "undefined") {
        localStorage.setItem("lockin.guest_name", name);
      }
    },
    [roomId, me]
  );

  const leave = useCallback(() => {
    if (!roomId) return;
    try {
      const bc = new BroadcastChannel(`lockin_room_${roomId}`);
      bc.postMessage({ type: "PRESENCE_LEAVE", memberId: me.id });
      bc.close();
    } catch {}
    deleteDoc(doc(db, "rooms", roomId, "participants", me.id)).catch(() => {});
  }, [roomId, me.id]);

  const startTimer = useCallback(
    (durationMin: number) => {
      if (!roomId) return;
      const timer: RoomTimer = {
        running: true,
        startedAt: new Date().toISOString(),
        durationMin,
      };

      setRoomData((prev) => ({ ...prev, timer }));

      // 1. BroadcastChannel (Instant concurrent start across tabs)
      try {
        const bc = new BroadcastChannel(`lockin_room_${roomId}`);
        bc.postMessage({ type: "TIMER_UPDATE", timer });
        bc.close();
      } catch {}

      // 2. Cloud Firestore (Cross-device sync)
      setDoc(
        doc(db, "rooms", roomId),
        { timer },
        { merge: true }
      ).catch(() => {});
    },
    [roomId]
  );

  const stopTimer = useCallback(() => {
    if (!roomId) return;
    const timer: RoomTimer = { running: false, durationMin: 25 };

    setRoomData((prev) => ({ ...prev, timer }));

    // 1. BroadcastChannel
    try {
      const bc = new BroadcastChannel(`lockin_room_${roomId}`);
      bc.postMessage({ type: "TIMER_UPDATE", timer });
      bc.close();
    } catch {}

    // 2. Cloud Firestore
    setDoc(
      doc(db, "rooms", roomId),
      { timer },
      { merge: true }
    ).catch(() => {});
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomId || !text.trim()) return;
      const currentMe = meRef.current;
      const newMsg: RoomMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        memberId: currentMe.id,
        name: currentMe.name,
        emoji: currentMe.emoji,
        text: text.trim(),
        at: new Date().toISOString(),
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // 1. BroadcastChannel
      try {
        const bc = new BroadcastChannel(`lockin_room_${roomId}`);
        bc.postMessage({ type: "CHAT_MESSAGE", message: newMsg });
        bc.close();
      } catch {}

      // 2. Cloud Firestore
      addDoc(collection(db, "rooms", roomId, "messages"), newMsg).catch(() => {});
    },
    [roomId]
  );

  return {
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
  };
}

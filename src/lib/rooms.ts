import { useEffect, useState, useCallback, useRef } from "react";
import { joinRoom } from "trystero/nostr";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface RoomMember {
  id: string;
  peerId?: string;
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
  const sidKey = `lockin.sid.v5.${userId}`;
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

  const local = loadLocalRooms();
  local[roomId] = newRoom;
  saveLocalRooms(local);

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

  const [trysteroRoom, setTrysteroRoom] = useState<any>(null);

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

  // Active participants map (keyed by member.id)
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

  // Trystero P2P Mesh Network (Connects any two browsers across the internet with 0 config)
  useEffect(() => {
    if (!roomId || typeof window === "undefined") return;

    let isMounted = true;
    let roomInstance: any = null;

    try {
      roomInstance = joinRoom({ appId: "lockin-study-network-v1" }, roomId);
      setTrysteroRoom(roomInstance);
    } catch (err) {
      console.warn("Trystero initialization error:", err);
      return;
    }

    const presenceAction = roomInstance.makeAction("presence");
    const timerAction = roomInstance.makeAction("timer");
    const chatAction = roomInstance.makeAction("chat");
    const patchAction = roomInstance.makeAction("patch");

    const getMyMember = (): RoomMember => {
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

    // When another user connects to this room ID anywhere on earth:
    roomInstance.onPeerJoin = (peerId: string) => {
      if (!isMounted) return;
      // Send our member profile to the newcomer
      presenceAction.send(getMyMember(), peerId);
    };

    // When a user closes tab / disconnects:
    roomInstance.onPeerLeave = (peerId: string) => {
      if (!isMounted) return;
      setActiveMembersMap((prev) => {
        const next: Record<string, RoomMember> = {};
        Object.entries(prev).forEach(([id, member]) => {
          if (member.peerId !== peerId) {
            next[id] = member;
          }
        });
        return next;
      });
    };

    // Receive presence announcement from peer
    presenceAction.onMessage = (peerMember: RoomMember, peerId: string) => {
      if (!isMounted || !peerMember || peerMember.id === me.id) return;
      setActiveMembersMap((prev) => ({
        ...prev,
        [peerMember.id]: {
          ...peerMember,
          peerId,
          lastSeen: String(Date.now()),
        },
      }));
      // Announce back so the connection is bidirectional
      presenceAction.send(getMyMember(), peerId);
    };

    // Receive synchronized timer start/stop from peer
    timerAction.onMessage = (timer: RoomTimer) => {
      if (!isMounted || !timer) return;
      setRoomData((prev) => ({ ...prev, timer }));
    };

    // Receive chat message from peer
    chatAction.onMessage = (msg: RoomMessage) => {
      if (!isMounted || !msg) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    // Receive status toggle (mic, camera, goal) from peer
    patchAction.onMessage = (data: { memberId: string; patch: Partial<RoomMember> }) => {
      if (!isMounted || !data?.memberId) return;
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
    };

    // Periodic heartbeat every 4 seconds to announce presence
    const heartbeat = setInterval(() => {
      presenceAction.send(getMyMember());
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(heartbeat);
      try {
        roomInstance.leave();
      } catch {}
      setTrysteroRoom(null);
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

  const startTimer = useCallback(
    (durationMin: number) => {
      if (!roomId) return;
      const timer: RoomTimer = {
        running: true,
        startedAt: new Date().toISOString(),
        durationMin,
      };

      setRoomData((prev) => ({ ...prev, timer }));

      // Broadcast to all peers over WebRTC data channels
      try {
        if (trysteroRoom) {
          const timerAction = trysteroRoom.makeAction("timer");
          timerAction.send(timer);
        }
      } catch (e) {
        console.warn("Timer broadcast warning:", e);
      }

      // Archival write to Firestore (if available)
      setDoc(doc(db, "rooms", roomId), { timer }, { merge: true }).catch(() => {});
    },
    [roomId, trysteroRoom]
  );

  const stopTimer = useCallback(() => {
    if (!roomId) return;
    const timer: RoomTimer = { running: false, durationMin: 25 };

    setRoomData((prev) => ({ ...prev, timer }));

    try {
      if (trysteroRoom) {
        const timerAction = trysteroRoom.makeAction("timer");
        timerAction.send(timer);
      }
    } catch (e) {
      console.warn("Timer stop warning:", e);
    }

    setDoc(doc(db, "rooms", roomId), { timer }, { merge: true }).catch(() => {});
  }, [roomId, trysteroRoom]);

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

      try {
        if (trysteroRoom) {
          const chatAction = trysteroRoom.makeAction("chat");
          chatAction.send(newMsg);
        }
      } catch (e) {
        console.warn("Chat broadcast warning:", e);
      }

      addDoc(collection(db, "rooms", roomId, "messages"), newMsg).catch(() => {});
    },
    [roomId, trysteroRoom]
  );

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
          if (trysteroRoom) {
            const patchAction = trysteroRoom.makeAction("patch");
            patchAction.send({ memberId: me.id, patch: { goal } });
          }
        } catch {}

        setDoc(doc(db, "rooms", roomId, "participants", me.id), { goal, lastSeen: Date.now() }, { merge: true }).catch(() => {});

        return { ...prev, [me.id]: updated };
      });
    },
    [roomId, me.id, trysteroRoom]
  );

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
          cameraOn: false,
          joinedAt: new Date().toISOString(),
        }),
        micOn: nextMic,
        lastSeen: String(Date.now()),
      };

      try {
        if (trysteroRoom) {
          const patchAction = trysteroRoom.makeAction("patch");
          patchAction.send({ memberId: me.id, patch: { micOn: nextMic } });
        }
      } catch {}

      setDoc(doc(db, "rooms", roomId, "participants", me.id), { micOn: nextMic, lastSeen: Date.now() }, { merge: true }).catch(() => {});

      return { ...prev, [me.id]: updated };
    });
  }, [roomId, me.id, trysteroRoom]);

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
          micOn: true,
          joinedAt: new Date().toISOString(),
        }),
        cameraOn: nextCam,
        lastSeen: String(Date.now()),
      };

      try {
        if (trysteroRoom) {
          const patchAction = trysteroRoom.makeAction("patch");
          patchAction.send({ memberId: me.id, patch: { cameraOn: nextCam } });
        }
      } catch {}

      setDoc(doc(db, "rooms", roomId, "participants", me.id), { cameraOn: nextCam, lastSeen: Date.now() }, { merge: true }).catch(() => {});

      return { ...prev, [me.id]: updated };
    });
  }, [roomId, me.id, trysteroRoom]);

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
          if (trysteroRoom) {
            const patchAction = trysteroRoom.makeAction("patch");
            patchAction.send({ memberId: me.id, patch: { name, emoji: newEmoji } });
          }
        } catch {}

        setDoc(doc(db, "rooms", roomId, "participants", me.id), { name, emoji: newEmoji, lastSeen: Date.now() }, { merge: true }).catch(() => {});

        return { ...prev, [me.id]: updated };
      });

      const newMe = { ...me, name, emoji: newEmoji };
      saveMe(newMe);
      if (typeof window !== "undefined") {
        localStorage.setItem("lockin.guest_name", name);
      }
    },
    [roomId, me, trysteroRoom]
  );

  const leave = useCallback(() => {
    if (!roomId) return;
    try {
      trysteroRoom?.leave();
    } catch {}
    deleteDoc(doc(db, "rooms", roomId, "participants", me.id)).catch(() => {});
  }, [roomId, me.id, trysteroRoom]);

  return {
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
  };
}

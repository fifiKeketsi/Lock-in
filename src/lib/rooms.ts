import { useEffect, useState, useCallback, useRef } from "react";
import { defaultRelayUrls, joinRoom, selfId } from "trystero/nostr";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export const TRYSTERO_APP_ID = "lockin-study-network-v2";

export const NOSTR_RELAYS = defaultRelayUrls;

// Unique per-tab/per-window runtime ID so duplicating a tab or opening an invite link in a new tab never collides
const TAB_INSTANCE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

export function normalizeRoomId(id: string | undefined | null): string {
  if (!id) return "";
  return id.trim().toLowerCase();
}

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

export type RoomTimerPhase = "study" | "break";

export interface RoomTimer {
  running: boolean;
  startedAt?: string;
  durationMin: number;
  breakDurationMin?: number;
  phase?: RoomTimerPhase;
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

  // Create a unique session ID for this specific browser tab/window instance
  const userId = authUser ? authUser.id : "guest";
  const sid = `${userId}_${TAB_INSTANCE_ID}`;

  const name = authUser
    ? authUser.name || authUser.email.split("@")[0] || "Member"
    : savedGuestName || `Friend ${TAB_INSTANCE_ID.slice(-4)}`;

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
  return Math.random().toString(36).slice(2, 8).toLowerCase();
}

export async function createRoom(
  name: string,
  authUser?: { id: string; name: string; email: string } | null
): Promise<Room> {
  const me = getMe(authUser);
  const roomId = normalizeRoomId(generateRoomId());
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
  ]).catch(() => { });

  return newRoom;
}

export function listRooms(): Room[] {
  return Object.values(loadLocalRooms()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteRoom(id: string) {
  const cleanId = normalizeRoomId(id);
  const rooms = loadLocalRooms();
  delete rooms[cleanId];
  saveLocalRooms(rooms);
  try {
    deleteDoc(doc(db, "rooms", cleanId)).catch(() => { });
  } catch (err) {
    console.warn("Error deleting room in Firestore:", err);
  }
}

export async function ensureRoomFromLink(
  id: string,
  name?: string,
  authUser?: { id: string; name: string; email: string } | null
): Promise<Room> {
  const cleanId = normalizeRoomId(id);
  const me = getMe(authUser);
  const local = loadLocalRooms();

  try {
    const snap: any = await Promise.race([
      getDoc(doc(db, "rooms", cleanId)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
    ]);
    if (snap && snap.exists()) {
      const data = snap.data() as Room;
      local[cleanId] = { ...data, id: cleanId, members: local[cleanId]?.members || [], messages: [] };
      saveLocalRooms(local);
      return local[cleanId];
    }
  } catch (err) {
    console.warn("Firestore check room warning:", err);
  }

  const placeholder: Room = local[cleanId] || {
    id: cleanId,
    name: name || `Focus Room #${cleanId}`,
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members: [],
    messages: [],
    timer: { running: false, durationMin: 25 },
  };
  local[cleanId] = placeholder;
  saveLocalRooms(local);

  Promise.race([
    setDoc(
      doc(db, "rooms", cleanId),
      {
        id: cleanId,
        name: placeholder.name,
        createdAt: placeholder.createdAt,
        creatorId: placeholder.creatorId,
        timer: placeholder.timer,
      },
      { merge: true }
    ),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => { });

  return placeholder;
}

interface ActiveTrysteroSession {
  roomId: string;
  room: any;
  refCount: number;
  leaveTimer: any;
  presenceAction: any;
  timerAction: any;
  chatAction: any;
  patchAction: any;
}

let activeSession: ActiveTrysteroSession | null = null;

export function useRoom(
  roomId: string | undefined,
  authUser?: { id: string; name: string; email: string } | null
) {
  const cleanRoomId = normalizeRoomId(roomId);
  const me = getMe(authUser);
  const meRef = useRef<MeProfile>(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const [trysteroRoom, setTrysteroRoom] = useState<any>(() => activeSession?.roomId === cleanRoomId ? activeSession.room : null);

  // Timer & Room metadata
  const [roomData, setRoomData] = useState<{ id: string; name: string; timer: RoomTimer }>(() => {
    if (!cleanRoomId) return { id: "room", name: "Focus Room", timer: { running: false, durationMin: 25 } };
    const l = loadLocalRooms()[cleanRoomId];
    return {
      id: cleanRoomId,
      name: l?.name || `Focus Room #${cleanRoomId}`,
      timer: l?.timer || { running: false, durationMin: 25 },
    };
  });

  // Active participants map (keyed by member.id)
  const [activeMembersMap, setActiveMembersMap] = useState<Record<string, RoomMember>>(() => ({
    [me.id]: {
      id: me.id,
      peerId: selfId,
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

  const localMemberRef = useRef<RoomMember>(activeMembersMap[me.id]);
  useEffect(() => {
    localMemberRef.current = activeMembersMap[me.id];
  }, [activeMembersMap, me.id]);

  // Triple-Transport Mesh: Firestore Real-Time onSnapshot + Trystero WebRTC + BroadcastChannel (Local)
  useEffect(() => {
    if (!cleanRoomId || typeof window === "undefined") return;

    let isMounted = true;
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;

    if (activeSession && activeSession.roomId === cleanRoomId) {
      if (activeSession.leaveTimer) {
        clearTimeout(activeSession.leaveTimer);
        activeSession.leaveTimer = null;
      }
      activeSession.refCount++;
    } else {
      if (activeSession) {
        if (activeSession.leaveTimer) clearTimeout(activeSession.leaveTimer);
        try {
          activeSession.room.leave();
        } catch {}
        activeSession = null;
      }

      let roomInstance: any = null;
      try {
        roomInstance = joinRoom(
          {
            appId: TRYSTERO_APP_ID,
            relayConfig: {
              urls: NOSTR_RELAYS,
              redundancy: 6,
              warnOnRelayFailure: false,
            },
          },
          cleanRoomId,
          {
            onJoinError: (err) => console.warn("[LockIn Trystero] Join error:", err),
          }
        );
      } catch (err) {
        console.warn("[LockIn Trystero] Initialization error:", err);
      }

      if (roomInstance) {
        activeSession = {
          roomId: cleanRoomId,
          room: roomInstance,
          refCount: 1,
          leaveTimer: null,
          presenceAction: roomInstance.makeAction("presence"),
          timerAction: roomInstance.makeAction("timer"),
          chatAction: roomInstance.makeAction("chat"),
          patchAction: roomInstance.makeAction("patch"),
        };
      }
    }

    const currentRoom = activeSession?.room;
    setTrysteroRoom(currentRoom);

    const presenceAction = activeSession?.presenceAction;
    const timerAction = activeSession?.timerAction;
    const chatAction = activeSession?.chatAction;
    const patchAction = activeSession?.patchAction;

    const getMyMember = (): RoomMember => {
      const currentMe = meRef.current;
      const local = localMemberRef.current;
      return {
        id: currentMe.id,
        peerId: selfId,
        name: local?.name || currentMe.name,
        emoji: local?.emoji || currentMe.emoji,
        goal: local?.goal || "Focusing",
        joinedAt: local?.joinedAt || new Date().toISOString(),
        lastSeen: String(Date.now()),
        cameraOn: local?.cameraOn ?? false,
        micOn: local?.micOn ?? true,
      };
    };

    const syncMemberToFirestore = (member: RoomMember) => {
      setDoc(
        doc(db, "rooms", cleanRoomId, "participants", member.id),
        {
          ...member,
          peerId: selfId,
          lastSeen: String(Date.now()),
        },
        { merge: true }
      ).catch(() => {});
    };

    if (currentRoom) {
      currentRoom.onPeerJoin = (peerId: string) => {
        if (!isMounted) return;
        const myMember = getMyMember();
        presenceAction?.send(myMember, { target: peerId });
        presenceAction?.send(myMember);
      };

      currentRoom.onPeerLeave = (peerId: string) => {
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

      if (presenceAction) {
        presenceAction.onMessage = (peerMember: RoomMember, context: any) => {
          const senderPeerId = typeof context === "string" ? context : context?.peerId;
          if (!isMounted || !peerMember || peerMember.id === meRef.current.id) return;
          setActiveMembersMap((prev) => ({
            ...prev,
            [peerMember.id]: {
              ...peerMember,
              peerId: senderPeerId || peerMember.peerId,
              lastSeen: String(Date.now()),
            },
          }));
          if (senderPeerId) {
            presenceAction.send(getMyMember(), { target: senderPeerId });
          }
        };
      }

      if (timerAction) {
        timerAction.onMessage = (timer: RoomTimer) => {
          if (!isMounted || !timer) return;
          setRoomData((prev) => ({ ...prev, timer }));
        };
      }

      if (chatAction) {
        chatAction.onMessage = (msg: RoomMessage) => {
          if (!isMounted || !msg) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg].sort((a, b) => (a.at || "").localeCompare(b.at || ""));
          });
        };
      }

      if (patchAction) {
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
      }
    }

    // 2. BroadcastChannel Local Mesh Events (Instant 0ms inter-tab)
    const handleBcMessage = (e: MessageEvent) => {
      if (!isMounted || !e.data) return;
      const data = e.data;
      if (data.type === "PRESENCE" && data.member && data.member.id !== meRef.current.id) {
        setActiveMembersMap((prev) => ({
          ...prev,
          [data.member.id]: { ...data.member, lastSeen: String(Date.now()) },
        }));
        if (data.isPing) {
          bc?.postMessage({ type: "PRESENCE", member: getMyMember(), isPing: false });
        }
      } else if (data.type === "TIMER" && data.timer) {
        setRoomData((prev) => ({ ...prev, timer: data.timer }));
      } else if (data.type === "CHAT" && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message].sort((a, b) => (a.at || "").localeCompare(b.at || ""));
        });
      } else if (data.type === "PATCH" && data.memberId && data.patch) {
        setActiveMembersMap((prev) => {
          if (!prev[data.memberId]) return prev;
          return {
            ...prev,
            [data.memberId]: { ...prev[data.memberId], ...data.patch, lastSeen: String(Date.now()) },
          };
        });
      } else if (data.type === "LEAVE" && data.memberId && data.memberId !== meRef.current.id) {
        setActiveMembersMap((prev) => {
          const next = { ...prev };
          delete next[data.memberId];
          return next;
        });
      }
    };

    bc?.addEventListener("message", handleBcMessage);

    // 3. Firestore Real-Time Listeners (Cross-device, cross-network guarantee)
    let unsubRoomDoc: (() => void) | null = null;
    let unsubParticipants: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;

    try {
      unsubRoomDoc = onSnapshot(
        doc(db, "rooms", cleanRoomId),
        (snap) => {
          if (!isMounted || !snap.exists()) return;
          const data = snap.data() as Partial<Room>;
          setRoomData((prev) => ({
            id: cleanRoomId,
            name: data.name || prev.name,
            timer: data.timer || prev.timer,
          }));
        },
        () => {}
      );

      unsubParticipants = onSnapshot(
        collection(db, "rooms", cleanRoomId, "participants"),
        (snap) => {
          if (!isMounted) return;
          const now = Date.now();
          setActiveMembersMap((prev) => {
            const myId = meRef.current.id;
            const next: Record<string, RoomMember> = {
              [myId]: prev[myId] || getMyMember(),
            };
            snap.docs.forEach((d) => {
              const m = d.data() as RoomMember;
              if (!m || !m.id || m.id === myId) return;
              const seenAt = Number(m.lastSeen || 0);
              if (now - seenAt < 25_000) {
                next[m.id] = {
                  ...prev[m.id],
                  ...m,
                  peerId: m.peerId || prev[m.id]?.peerId,
                };
              }
            });
            // Keep any recently seen BroadcastChannel/Trystero peers not yet flushed to Firestore
            Object.entries(prev).forEach(([id, member]) => {
              if (id !== myId && !next[id]) {
                const seenAt = Number(member.lastSeen || 0);
                if (now - seenAt < 12_000) {
                  next[id] = member;
                }
              }
            });
            return next;
          });
        },
        () => {}
      );

      unsubMessages = onSnapshot(
        collection(db, "rooms", cleanRoomId, "messages"),
        (snap) => {
          if (!isMounted) return;
          const remoteMsgs = snap.docs
            .map((d) => d.data() as RoomMessage)
            .filter((m) => Boolean(m && m.id && m.text));
          if (remoteMsgs.length === 0) return;
          setMessages((prev) => {
            const byId = new Map<string, RoomMessage>();
            prev.forEach((m) => byId.set(m.id, m));
            remoteMsgs.forEach((m) => byId.set(m.id, m));
            return Array.from(byId.values()).sort((a, b) =>
              (a.at || "").localeCompare(b.at || "")
            );
          });
        },
        () => {}
      );
    } catch {}

    // Initial announcement across all 3 transports (Trystero + BroadcastChannel + Firestore)
    const initialMe = getMyMember();
    presenceAction?.send(initialMe);
    bc?.postMessage({ type: "PRESENCE", member: initialMe, isPing: true });
    syncMemberToFirestore(initialMe);

    // Periodic heartbeat every 3 seconds + stale participant pruning
    let tickCount = 0;
    const heartbeat = setInterval(() => {
      tickCount++;
      const current = getMyMember();
      presenceAction?.send(current);
      bc?.postMessage({ type: "PRESENCE", member: current, isPing: false });
      if (tickCount % 2 === 0) {
        syncMemberToFirestore(current);
      }
      // Prune participants silent for >25s
      const now = Date.now();
      setActiveMembersMap((prev) => {
        const myId = meRef.current.id;
        let changed = false;
        const next: Record<string, RoomMember> = {};
        Object.entries(prev).forEach(([id, m]) => {
          if (id === myId || now - Number(m.lastSeen || 0) < 25_000) {
            next[id] = m;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 3000);

    const handleBeforeUnload = () => {
      bc?.postMessage({ type: "LEAVE", memberId: meRef.current.id });
      deleteDoc(doc(db, "rooms", cleanRoomId, "participants", meRef.current.id)).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unsubRoomDoc?.();
      unsubParticipants?.();
      unsubMessages?.();
      bc?.postMessage({ type: "LEAVE", memberId: meRef.current.id });
      bc?.removeEventListener("message", handleBcMessage);
      bc?.close();

      if (activeSession && activeSession.roomId === cleanRoomId) {
        activeSession.refCount--;
        if (activeSession.refCount <= 0) {
          const leavingMemberId = meRef.current.id;
          activeSession.leaveTimer = setTimeout(() => {
            if (activeSession && activeSession.refCount <= 0) {
              try {
                activeSession.room.leave();
              } catch {}
              activeSession = null;
              deleteDoc(doc(db, "rooms", cleanRoomId, "participants", leavingMemberId)).catch(() => {});
            }
          }, 400);
        }
      }
    };
  }, [cleanRoomId]);

  // Combined room object
  const room: Room = {
    id: cleanRoomId || "room",
    name: roomData.name,
    createdAt: new Date().toISOString(),
    creatorId: me.id,
    members: Object.values(activeMembersMap),
    messages,
    timer: roomData.timer,
  };

  const startTimer = useCallback(
    (durationMin: number, breakDurationMin: number = 5, phase: RoomTimerPhase = "study") => {
      if (!cleanRoomId) return;
      const timer: RoomTimer = {
        running: true,
        startedAt: new Date().toISOString(),
        durationMin,
        breakDurationMin,
        phase,
      };

      setRoomData((prev) => ({ ...prev, timer }));

      // Broadcast to all peers over WebRTC data channels
      try {
        if (activeSession?.timerAction) {
          activeSession.timerAction.send(timer);
        }
      } catch (e) {
        console.warn("Timer broadcast warning:", e);
      }

      try {
        const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
        bc?.postMessage({ type: "TIMER", timer });
        bc?.close();
      } catch {}

      // Archival write to Firestore (if available)
      setDoc(doc(db, "rooms", cleanRoomId), { timer }, { merge: true }).catch(() => { });
    },
    [cleanRoomId]
  );

  const stopTimer = useCallback(() => {
    if (!cleanRoomId) return;
    const timer: RoomTimer = { running: false, durationMin: 25, breakDurationMin: 5, phase: "study" };

    setRoomData((prev) => ({ ...prev, timer }));

    try {
      if (activeSession?.timerAction) {
        activeSession.timerAction.send(timer);
      }
    } catch (e) {
      console.warn("Timer stop warning:", e);
    }

    try {
      const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
      bc?.postMessage({ type: "TIMER", timer });
      bc?.close();
    } catch {}

    setDoc(doc(db, "rooms", cleanRoomId), { timer }, { merge: true }).catch(() => { });
  }, [cleanRoomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!cleanRoomId || !text.trim()) return;
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
        if (activeSession?.chatAction) {
          activeSession.chatAction.send(newMsg);
        }
      } catch (e) {
        console.warn("Chat broadcast warning:", e);
      }

      try {
        const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
        bc?.postMessage({ type: "CHAT", message: newMsg });
        bc?.close();
      } catch {}

      setDoc(doc(db, "rooms", cleanRoomId, "messages", newMsg.id), newMsg).catch(() => { });
    },
    [cleanRoomId]
  );

  const setGoal = useCallback(
    (goal: string) => {
      if (!cleanRoomId) return;
      setActiveMembersMap((prev) => {
        const current = prev[me.id];
        const updated: RoomMember = {
          ...(current || {
            id: me.id,
            peerId: selfId,
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
          if (activeSession?.patchAction) {
            activeSession.patchAction.send({ memberId: me.id, patch: { goal } });
          }
        } catch { }

        try {
          const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
          bc?.postMessage({ type: "PATCH", memberId: me.id, patch: { goal } });
          bc?.close();
        } catch {}

        setDoc(doc(db, "rooms", cleanRoomId, "participants", me.id), updated, { merge: true }).catch(() => { });

        return { ...prev, [me.id]: updated };
      });
    },
    [cleanRoomId, me.id, me.name, me.emoji]
  );

  const toggleMic = useCallback(() => {
    if (!cleanRoomId) return;
    setActiveMembersMap((prev) => {
      const current = prev[me.id];
      const nextMic = !(current?.micOn ?? true);
      const updated: RoomMember = {
        ...(current || {
          id: me.id,
          peerId: selfId,
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
        if (activeSession?.patchAction) {
          activeSession.patchAction.send({ memberId: me.id, patch: { micOn: nextMic } });
        }
      } catch { }

      try {
        const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
        bc?.postMessage({ type: "PATCH", memberId: me.id, patch: { micOn: nextMic } });
        bc?.close();
      } catch {}

      setDoc(doc(db, "rooms", cleanRoomId, "participants", me.id), updated, { merge: true }).catch(() => { });

      return { ...prev, [me.id]: updated };
    });
  }, [cleanRoomId, me.id, me.name, me.emoji]);

  const toggleCamera = useCallback(() => {
    if (!cleanRoomId) return;
    setActiveMembersMap((prev) => {
      const current = prev[me.id];
      const nextCam = !(current?.cameraOn ?? false);
      const updated: RoomMember = {
        ...(current || {
          id: me.id,
          peerId: selfId,
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
        if (activeSession?.patchAction) {
          activeSession.patchAction.send({ memberId: me.id, patch: { cameraOn: nextCam } });
        }
      } catch { }

      try {
        const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
        bc?.postMessage({ type: "PATCH", memberId: me.id, patch: { cameraOn: nextCam } });
        bc?.close();
      } catch {}

      setDoc(doc(db, "rooms", cleanRoomId, "participants", me.id), updated, { merge: true }).catch(() => { });

      return { ...prev, [me.id]: updated };
    });
  }, [cleanRoomId, me.id, me.name, me.emoji]);

  const updateProfile = useCallback(
    (name: string, emoji?: string) => {
      if (!cleanRoomId) return;
      const newEmoji = emoji || me.emoji;
      setActiveMembersMap((prev) => {
        const current = prev[me.id];
        const updated: RoomMember = {
          ...(current || {
            id: me.id,
            peerId: selfId,
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
          if (activeSession?.patchAction) {
            activeSession.patchAction.send({ memberId: me.id, patch: { name, emoji: newEmoji } });
          }
        } catch { }

        try {
          const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin_bc_${cleanRoomId}`) : null;
          bc?.postMessage({ type: "PATCH", memberId: me.id, patch: { name, emoji: newEmoji } });
          bc?.close();
        } catch {}

        setDoc(doc(db, "rooms", cleanRoomId, "participants", me.id), updated, { merge: true }).catch(() => { });

        return { ...prev, [me.id]: updated };
      });

      const newMe = { ...me, name, emoji: newEmoji };
      saveMe(newMe);
      if (typeof window !== "undefined") {
        localStorage.setItem("lockin.guest_name", name);
      }
    },
    [cleanRoomId, me]
  );

  const leave = useCallback(() => {
    if (!cleanRoomId) return;
    if (activeSession && activeSession.roomId === cleanRoomId) {
      if (activeSession.leaveTimer) clearTimeout(activeSession.leaveTimer);
      try {
        console.log(`[LockIn Trystero] Explicit leave called for room ${cleanRoomId}`);
        activeSession.room.leave();
      } catch {}
      activeSession = null;
    }
    deleteDoc(doc(db, "rooms", cleanRoomId, "participants", me.id)).catch(() => { });
    setTrysteroRoom(null);
  }, [cleanRoomId, me.id]);

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

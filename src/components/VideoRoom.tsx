import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, AlertCircle, RefreshCw } from "lucide-react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VideoRoomProps {
  roomId?: string;
  members: {
    id: string;
    name: string;
    emoji: string;
    cameraOn: boolean;
    micOn: boolean;
  }[];
  currentUserId: string;
  onToggleCamera: () => void;
  onToggleMic: () => void;
}

function LocalVideo({
  stream,
  cameraOn,
  emoji,
  name,
}: {
  stream: MediaStream | null;
  cameraOn: boolean;
  emoji: string;
  name: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraOn]);

  const showVideo = cameraOn && !!stream;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {!showVideo && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
          <div className="text-6xl animate-pulse">{emoji}</div>
          <div className="mt-2 text-sm font-medium text-muted-foreground">{name} (you)</div>
        </div>
      )}
    </div>
  );
}

function RemoteVideo({
  stream,
  cameraOn,
  emoji,
  name,
}: {
  stream?: MediaStream;
  cameraOn: boolean;
  emoji: string;
  name: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dedicated audio element ensures microphone audio plays even if video is hidden
  useEffect(() => {
    if (audioRef.current && stream) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraOn]);

  const showVideo = cameraOn && !!stream;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80">
      <audio ref={audioRef} autoPlay playsInline />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {!showVideo && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
          <div className="text-6xl">{emoji}</div>
          <div className="mt-2 text-sm font-medium text-muted-foreground">{name}</div>
        </div>
      )}
    </div>
  );
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
};

export function VideoRoom({ roomId, members, currentUserId, onToggleCamera, onToggleMic }: VideoRoomProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const candidateQueuesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const currentUser = members.find((m) => m.id === currentUserId);
  const safeMembers = members.map((m) => ({
    ...m,
    cameraOn: m.cameraOn ?? false,
    micOn: m.micOn ?? false,
  }));

  const startCamera = useCallback(async () => {
    setMediaError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err: any) {
      console.error("Error accessing camera/mic:", err);
      setMediaError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone/Camera permission denied. Please click the lock icon in your browser URL bar and allow Microphone & Camera access."
          : "Could not detect an active camera or microphone on this device."
      );
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [startCamera]);

  // Update track enabled states whenever mic or camera toggles
  useEffect(() => {
    if (localStream && currentUser) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = currentUser.cameraOn ?? false;
      });
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = currentUser.micOn ?? false;
      });
    }
  }, [localStream, currentUser, currentUser?.cameraOn, currentUser?.micOn]);

  const remoteMemberIds = members
    .filter((m) => m.id !== currentUserId)
    .map((m) => m.id)
    .sort();
  const remoteMemberIdsKey = remoteMemberIds.join(",");

  // WebRTC Mesh Signaling via Cloud Firestore (Cross-device) and BroadcastChannel (Same-device)
  useEffect(() => {
    if (!roomId || !localStream || typeof window === "undefined") return;

    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`lockin-webrtc-${roomId}`) : null;

    // Helper to send signals over Firestore + BroadcastChannel
    const sendSignal = async (to: string, type: string, payload: any) => {
      const signalData = {
        from: currentUserId,
        to,
        type,
        data: JSON.stringify(payload),
        timestamp: Date.now(),
      };

      // BroadcastChannel for local tabs
      bc?.postMessage(signalData);

      // Firestore for friends over the internet
      try {
        await addDoc(collection(db, "rooms", roomId, "signals"), signalData);
      } catch (e) {
        console.warn("Signaling send error:", e);
      }
    };

    const getOrCreatePC = (remoteId: string): RTCPeerConnection => {
      const existing = pcsRef.current[remoteId];
      if (existing && existing.connectionState !== "closed" && existing.connectionState !== "failed") {
        return existing;
      }
      if (existing) {
        try {
          existing.close();
        } catch {}
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add all tracks from local stream
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Handle receiving tracks from friend
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) => ({ ...prev, [remoteId]: event.streams[0] }));
        }
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(remoteId, "candidate", event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remoteId];
            return next;
          });
        }
      };

      pcsRef.current[remoteId] = pc;
      return pc;
    };

    // Signal Dispatcher
    const handleSignal = async (signal: { from: string; to: string; type: string; data: string }) => {
      const { from, to, type, data } = signal;
      if (to !== currentUserId || from === currentUserId) return;

      try {
        const parsed = JSON.parse(data);

        if (type === "offer") {
          const pc = getOrCreatePC(from);
          await pc.setRemoteDescription(new RTCSessionDescription(parsed));

          // Flush any queued candidates
          const queued = candidateQueuesRef.current[from] || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          candidateQueuesRef.current[from] = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(from, "answer", answer);
        } else if (type === "answer") {
          const pc = pcsRef.current[from];
          if (pc && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(parsed));

            const queued = candidateQueuesRef.current[from] || [];
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            candidateQueuesRef.current[from] = [];
          }
        } else if (type === "candidate") {
          const pc = pcsRef.current[from];
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(parsed)).catch(() => {});
          } else {
            candidateQueuesRef.current[from] = candidateQueuesRef.current[from] || [];
            candidateQueuesRef.current[from].push(parsed);
          }
        }
      } catch (err) {
        console.warn("Signal handling error:", err);
      }
    };

    // 1. Listen for signals via BroadcastChannel
    const onBcMessage = (event: MessageEvent) => {
      if (event.data) handleSignal(event.data);
    };
    bc?.addEventListener("message", onBcMessage);

    // 2. Listen for signals via Cloud Firestore
    const q = query(
      collection(db, "rooms", roomId, "signals"),
      where("to", "==", currentUserId)
    );

    const unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data() as any;
            handleSignal(data);
            deleteDoc(change.doc.ref).catch(() => {});
          }
        });
      },
      (err) => {
        console.warn("Signals listener error:", err);
      }
    );

    // 3. Clean up connections for peers who left the room
    const currentPeers = new Set(remoteMemberIds);
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!currentPeers.has(peerId)) {
        try {
          pcsRef.current[peerId].close();
        } catch {}
        delete pcsRef.current[peerId];
        delete candidateQueuesRef.current[peerId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });

    // 4. Perfect negotiation: initiator sends offer to peers with greater IDs
    remoteMemberIds.forEach(async (peerId) => {
      const isInitiator = currentUserId < peerId;
      if (isInitiator) {
        const pc = getOrCreatePC(peerId);
        try {
          const offer = await pc.createOffer();
          if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription(offer);
            await sendSignal(peerId, "offer", offer);
          }
        } catch (e) {
          console.warn("Offer creation error:", e);
        }
      }
    });

    return () => {
      bc?.removeEventListener("message", onBcMessage);
      bc?.close();
      unsubscribeFirestore();
      Object.values(pcsRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      pcsRef.current = {};
      candidateQueuesRef.current = {};
    };
  }, [roomId, currentUserId, localStream, remoteMemberIdsKey]);

  const isMyMicOn = currentUser?.micOn ?? false;
  const isMyCameraOn = currentUser?.cameraOn ?? false;

  return (
    <div className="space-y-4">
      {/* Permission / Hardware error warning banner */}
      {mediaError && (
        <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-sm text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{mediaError}</span>
          </div>
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-medium shrink-0"
          >
            <RefreshCw className="size-3.5" /> Retry Access
          </button>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeMembers.map((member) => {
          const isMe = member.id === currentUserId;
          return (
            <div
              key={member.id}
              className="relative rounded-2xl overflow-hidden bg-card border border-border aspect-video shadow-sm"
            >
              {isMe ? (
                <LocalVideo
                  stream={localStream}
                  cameraOn={member.cameraOn}
                  emoji={member.emoji}
                  name={member.name}
                />
              ) : (
                <RemoteVideo
                  stream={remoteStreams[member.id]}
                  cameraOn={member.cameraOn}
                  emoji={member.emoji}
                  name={member.name}
                />
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                <div className="flex gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-white">
                  {member.micOn ? (
                    <Mic className="size-4 text-emerald-400" />
                  ) : (
                    <MicOff className="size-4 text-rose-400" />
                  )}
                  {member.cameraOn ? (
                    <Video className="size-4 text-emerald-400" />
                  ) : (
                    <VideoOff className="size-4 text-rose-400" />
                  )}
                </div>
                <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white">
                  {member.name}
                  {isMe && " (you)"}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty placeholders if fewer than 3 participants */}
        {safeMembers.length < 3 &&
          Array.from({ length: 3 - safeMembers.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-2xl bg-muted/40 border border-dashed border-border aspect-video flex flex-col items-center justify-center text-muted-foreground/60 text-xs"
            >
              <span>Waiting for friend to join…</span>
            </div>
          ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-3 pt-2">
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all shadow-sm ${
            isMyMicOn
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          }`}
        >
          {isMyMicOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          <span className="text-sm">{isMyMicOn ? "Mic Live" : "Mic Muted"}</span>
        </button>

        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all shadow-sm ${
            isMyCameraOn
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-secondary hover:bg-secondary/80 text-foreground"
          }`}
        >
          {isMyCameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          <span className="text-sm">{isMyCameraOn ? "Camera On" : "Camera Off"}</span>
        </button>
      </div>
    </div>
  );
}

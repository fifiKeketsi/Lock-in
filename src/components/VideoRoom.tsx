import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, AlertCircle, RefreshCw } from "lucide-react";

interface VideoRoomProps {
  roomId?: string;
  members: {
    id: string;
    peerId?: string;
    name: string;
    emoji: string;
    cameraOn: boolean;
    micOn: boolean;
  }[];
  currentUserId: string;
  trysteroRoom?: any;
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

  // Dedicated audio element ensures microphone audio plays continuously even if video is hidden
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

export function VideoRoom({
  members,
  currentUserId,
  trysteroRoom,
  onToggleCamera,
  onToggleMic,
}: VideoRoomProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

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
  }, [localStream, currentUser?.cameraOn, currentUser?.micOn]);

  // Connect local and remote media streams via Trystero P2P WebRTC
  useEffect(() => {
    if (!trysteroRoom || !localStream) return;

    try {
      trysteroRoom.addStream(localStream);
    } catch (e) {
      console.warn("Trystero addStream warning:", e);
    }

    trysteroRoom.onPeerStream = (stream: MediaStream, peerId: string) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };

    trysteroRoom.onPeerLeave = (peerId: string) => {
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };
  }, [trysteroRoom, localStream]);

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
          const remoteStream =
            (member.peerId && remoteStreams[member.peerId]) ||
            remoteStreams[member.id];

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
                  stream={remoteStream}
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

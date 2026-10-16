import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, AlertCircle, RefreshCw, UserPlus } from "lucide-react";

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
    <div className="relative w-full h-full flex items-center justify-center bg-[#191919]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {!showVideo && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#eceae0] dark:bg-[#242220] transition-colors">
          <div className="text-5xl md:text-6xl select-none transform transition-transform hover:scale-110">{emoji}</div>
          <div className="mt-2 text-xs font-bold text-foreground">{name} (you)</div>
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#191919]">
      <audio ref={audioRef} autoPlay playsInline />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {!showVideo && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#eceae0] dark:bg-[#242220] transition-colors">
          <div className="text-5xl md:text-6xl select-none">{emoji}</div>
          <div className="mt-2 text-xs font-bold text-foreground">{name}</div>
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
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [mediaError, setMediaError] = useState<string | null>(null);

  const currentUser = members.find((m) => m.id === currentUserId);
  const safeMembers = members.length > 0 ? members : currentUser ? [currentUser] : [];

  const startCamera = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      if (trysteroRoom) {
        try {
          trysteroRoom.addStream(stream);
        } catch (e) {
          console.warn("Trystero addStream error:", e);
        }
      }
    } catch (err: any) {
      console.warn("Camera/mic error:", err);
      // Fallback: Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioStream);
        if (trysteroRoom) {
          try {
            trysteroRoom.addStream(audioStream);
          } catch {}
        }
      } catch (err2: any) {
        setMediaError(
          err.name === "NotAllowedError" || err2.name === "NotAllowedError"
            ? "Microphone/Camera permission denied. Enable browser media permissions to talk."
            : "No camera or microphone hardware found."
        );
      }
    }
  }, [trysteroRoom]);

  useEffect(() => {
    startCamera();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = currentUser?.cameraOn ?? false;
      });
    }
  }, [currentUser?.cameraOn, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = currentUser?.micOn ?? true;
      });
    }
  }, [currentUser?.micOn, localStream]);

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
        <div className="rounded-2xl bg-[#fee2e2] dark:bg-[#450a0a] border border-[#ef4444]/40 p-3.5 text-xs text-[#991b1b] dark:text-[#fecaca] flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-[#ef4444]" />
            <span>{mediaError}</span>
          </div>
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444] text-white hover:opacity-90 text-[11px] font-bold shrink-0"
          >
            <RefreshCw className="size-3" /> Retry Media
          </button>
        </div>
      )}

      {/* Video Grid with StudyFetch Bento Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeMembers.map((member) => {
          const isMe = member.id === currentUserId;
          const remoteStream =
            (member.peerId && remoteStreams[member.peerId]) ||
            remoteStreams[member.id];

          return (
            <div
              key={member.id}
              className="relative rounded-3xl overflow-hidden bg-card border border-border aspect-video shadow-card group transition-all duration-300"
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

              {/* Status Floating Pill Overlays */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                <div className="flex items-center gap-1.5 bg-[#191919]/75 dark:bg-[#faf9f5]/85 backdrop-blur-md px-2.5 py-1 rounded-full text-white dark:text-[#191919] shadow-sm">
                  {member.micOn ? (
                    <Mic className="size-3.5 text-[#22c55e]" />
                  ) : (
                    <MicOff className="size-3.5 text-[#ef4444]" />
                  )}
                  {member.cameraOn ? (
                    <Video className="size-3.5 text-[#22c55e]" />
                  ) : (
                    <VideoOff className="size-3.5 text-[#ef4444]" />
                  )}
                </div>
                <div className="bg-[#191919]/75 dark:bg-[#faf9f5]/85 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white dark:text-[#191919] shadow-sm">
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
              className="rounded-3xl bg-secondary/30 border border-dashed border-border aspect-video flex flex-col items-center justify-center text-muted-foreground/70 p-4 text-center space-y-1.5 transition-colors"
            >
              <UserPlus className="size-5 text-muted-foreground/60" />
              <span className="text-xs font-semibold text-foreground">Waiting for peer…</span>
              <span className="text-[10px] text-muted-foreground">Share the invite link to study together</span>
            </div>
          ))}
      </div>

      {/* Media Controls Styled as StudyFetch Pills */}
      <div className="flex justify-center items-center gap-3 pt-2">
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            isMyMicOn
              ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] hover:opacity-90"
              : "bg-[#fee2e2] text-[#991b1b] border border-[#ef4444]/30 hover:bg-[#fecaca]"
          }`}
        >
          {isMyMicOn ? <Mic className="size-4 text-[#22c55e]" /> : <MicOff className="size-4" />}
          <span>{isMyMicOn ? "Mic Live" : "Mic Muted"}</span>
        </button>

        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            isMyCameraOn
              ? "bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] hover:opacity-90"
              : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          {isMyCameraOn ? <Video className="size-4 text-[#22c55e]" /> : <VideoOff className="size-4" />}
          <span>{isMyCameraOn ? "Camera Live" : "Camera Off"}</span>
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

export type ProcrastinationSensorReason = "blur" | "motion" | "mouse" | "exit";

interface UseProcrastinationSensorsOptions {
  enabled: boolean;
  cooldownMs?: number;
  showDesktopNotification?: boolean;
  onTrigger: (reason: ProcrastinationSensorReason) => void;
}

/**
 * Shared multi-sensor hook that detects off-task behavior during an active study block:
 * 1. Tab switch / window minimization (`visibilitychange` -> "exit")
 * 2. Window focus loss (`blur` -> "blur")
 * 3. Top-edge cursor exit intent (`mouseleave` -> "mouse")
 * 4. Physical mobile device pickup (`deviceorientation` > 35° tilt -> "motion")
 */
export function useProcrastinationSensors({
  enabled,
  cooldownMs = 8000,
  showDesktopNotification = false,
  onTrigger,
}: UseProcrastinationSensorsOptions) {
  const hasTriggeredRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;

    if (
      showDesktopNotification &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }

    const trigger = (reason: ProcrastinationSensorReason) => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      onTriggerRef.current(reason);

      if (
        showDesktopNotification &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("⚠️ PUT YOUR DEVICE DOWN!", {
            body: "Your Lock-In focus timer is actively running! Return to your desk immediately.",
            icon: "/favicon.svg",
            requireInteraction: true,
          });
        } catch {}
      }

      setTimeout(() => {
        hasTriggeredRef.current = false;
      }, cooldownMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) trigger("exit");
    };

    const handleBlur = () => {
      trigger("blur");
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) trigger("mouse");
    };

    let initialBeta: number | null = null;
    let initialGamma: number | null = null;

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (initialBeta === null || initialGamma === null) {
        initialBeta = e.beta;
        initialGamma = e.gamma;
        return;
      }
      if (Math.abs(e.beta - initialBeta) > 35 || Math.abs(e.gamma - initialGamma) > 35) {
        trigger("motion");
        initialBeta = e.beta;
        initialGamma = e.gamma;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("deviceorientation", handleDeviceOrientation);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, [enabled, cooldownMs, showDesktopNotification]);
}


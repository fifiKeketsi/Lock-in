import { createZipBlob } from "./zip";

export interface DistractionApp {
  id: string;
  name: string;
  domain: string;
  category: "social" | "video" | "gaming" | "custom";
  icon: string;
}

export const DEFAULT_APPS: DistractionApp[] = [
  // Social
  { id: "instagram", name: "Instagram", domain: "instagram.com", category: "social", icon: "📸" },
  { id: "tiktok", name: "TikTok", domain: "tiktok.com", category: "social", icon: "🎵" },
  { id: "x", name: "X / Twitter", domain: "x.com", category: "social", icon: "🐦" },
  { id: "reddit", name: "Reddit", domain: "reddit.com", category: "social", icon: "👾" },
  { id: "facebook", name: "Facebook", domain: "facebook.com", category: "social", icon: "📘" },
  { id: "snapchat", name: "Snapchat", domain: "snapchat.com", category: "social", icon: "👻" },
  { id: "threads", name: "Threads", domain: "threads.net", category: "social", icon: "🧵" },
  // Video & Streams
  { id: "youtube", name: "YouTube", domain: "youtube.com", category: "video", icon: "▶️" },
  { id: "netflix", name: "Netflix", domain: "netflix.com", category: "video", icon: "🎬" },
  { id: "twitch", name: "Twitch", domain: "twitch.tv", category: "video", icon: "🟣" },
  { id: "disneyplus", name: "Disney+", domain: "disneyplus.com", category: "video", icon: "🏰" },
  // Games & Time Wasters
  { id: "discord", name: "Discord", domain: "discord.com", category: "gaming", icon: "💬" },
  { id: "roblox", name: "Roblox", domain: "roblox.com", category: "gaming", icon: "🧱" },
  { id: "steam", name: "Steam Store", domain: "steampowered.com", category: "gaming", icon: "🎮" },
  { id: "chess", name: "Chess.com", domain: "chess.com", category: "gaming", icon: "♟️" },
];

const BLOCKED_APPS_KEY = "lockin.blocked_apps.v2";
const ACTIVE_SESSION_KEY = "lockin.active_focus_session.v1";
export const FOCUS_SYNC_CHANNEL = "lockin_focus_sync_v1";

export interface ActiveFocusSessionState {
  mode: "solo" | "room";
  originPath: string;
  roomId?: string;
  taskId?: string;
  running: boolean;
  phase: "study" | "break";
  studyDuration: number;
  breakDuration: number;
  endTime: number | null;
  remainingSec: number;
  nudgesTriggered: number;
  updatedAt: number;
}

export function getActiveFocusSession(): ActiveFocusSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveFocusSessionState;
    // Ignore stale sessions older than 6 hours
    if (Date.now() - (parsed.updatedAt || 0) > 6 * 60 * 60 * 1000) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveFocusSession(session: ActiveFocusSessionState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ ...session, updatedAt: Date.now() })
    );
  } catch {}
}

export function clearActiveFocusSession(mode?: "solo" | "room", roomId?: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getActiveFocusSession();
    if (!current) return;
    if (mode && current.mode !== mode) return;
    if (roomId && current.roomId !== roomId) return;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
}

export function getSavedBlockedDomains(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_APPS.slice(0, 8).map((a) => a.domain);
  }
  try {
    const raw = localStorage.getItem(BLOCKED_APPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_APPS.slice(0, 8).map((a) => a.domain);
}

export function saveBlockedDomains(domains: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(domains));
  } catch {}
}

export function buildExtensionZip(blockedDomains: string[]): Blob {
  const domains = blockedDomains.length > 0 ? blockedDomains : ["instagram.com", "tiktok.com", "youtube.com"];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

  const manifest = {
    manifest_version: 3,
    name: "Lock-In Hard Distraction Shield",
    version: "1.3.0",
    description: "Hard-blocks social media, video platforms, and mobile distraction sites during active focus sessions and study rooms.",
    permissions: ["declarativeNetRequest", "storage", "alarms", "tabs"],
    host_permissions: ["<all_urls>"],
    declarative_net_request: {
      rule_resources: [
        {
          id: "lockin_rules",
          enabled: true,
          path: "rules.json",
        },
      ],
    },
    background: {
      service_worker: "background.js",
    },
    action: {
      default_title: "Lock-In Distraction Shield: Active",
    },
  };

  const rules = domains.map((d, idx) => ({
    id: idx + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: `${appOrigin}/focus?blocked=${encodeURIComponent(d)}`,
      },
    },
    condition: {
      urlFilter: `||${d}`,
      resourceTypes: ["main_frame"],
    },
  }));

  const backgroundJs = `// Lock-In Hard Distraction Shield - Background Service Worker
const APP_ORIGIN = ${JSON.stringify(appOrigin)};
let lastActiveLockInUrl = APP_ORIGIN + "/focus";

console.log("[Lock-In Shield] Initialized with active rules for ${domains.length} blocked platforms.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Lock-In Shield] Extension loaded. Focus protection armed.");
});

// Track the user's active Lock-In timer tab and return to it instead of opening a new tab/page
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (!currentUrl) return;

  // Remember the most recent active Lock-In focus or study room URL (excluding ?blocked= redirects)
  if (
    currentUrl.startsWith(APP_ORIGIN) &&
    !currentUrl.includes("blocked=") &&
    (currentUrl.includes("/focus") || currentUrl.includes("/rooms/"))
  ) {
    lastActiveLockInUrl = currentUrl;
    return;
  }

  // If this tab was just redirected to /focus?blocked=...
  if (currentUrl.startsWith(APP_ORIGIN) && currentUrl.includes("blocked=")) {
    try {
      const allTabs = await chrome.tabs.query({});
      // Find an existing open tab where Lock-In (/focus or /rooms/) is already running
      const existingTimerTab = allTabs.find(
        (t) =>
          t.id !== tabId &&
          t.url &&
          t.url.startsWith(APP_ORIGIN) &&
          !t.url.includes("blocked=") &&
          (t.url.includes("/focus") || t.url.includes("/rooms/"))
      );

      if (existingTimerTab && existingTimerTab.id != null) {
        // Switch focus back to the original timer tab and close the restricted tab
        if (existingTimerTab.windowId != null) {
          await chrome.windows.update(existingTimerTab.windowId, { focused: true });
        }
        await chrome.tabs.update(existingTimerTab.id, { active: true });
        await chrome.tabs.remove(tabId);
      } else if (lastActiveLockInUrl && lastActiveLockInUrl !== currentUrl) {
        // Same-tab navigation: restore the exact original page (e.g. /rooms/xyz or /focus)
        const parsed = new URL(currentUrl);
        const blockedDomain = parsed.searchParams.get("blocked");
        const targetUrl = new URL(lastActiveLockInUrl);
        if (blockedDomain) {
          targetUrl.searchParams.set("blocked", blockedDomain);
        }
        if (targetUrl.toString() !== currentUrl) {
          await chrome.tabs.update(tabId, { url: targetUrl.toString() });
        }
      }
    } catch (err) {
      console.warn("[Lock-In Shield] Tab handoff error:", err);
    }
  }
});
`;

  const readmeMd = `# Lock-In Hard Distraction Shield (Chrome / Edge / Brave Extension)

This extension automatically blocks access to your selected distraction platforms during deep-work focus sessions and synchronized study rooms.

### 30-Second Quick Setup:
1. Unzip this downloaded archive into a folder on your computer.
2. In Google Chrome, Microsoft Edge, or Brave, navigate to:
   - **Chrome**: \`chrome://extensions\`
   - **Edge**: \`edge://extensions\`
   - **Brave**: \`brave://extensions\`
3. In the top-right corner, turn on **"Developer mode"**.
4. Click the **"Load unpacked"** button and select this unzipped folder.
5. All set! Whenever you lock in, attempts to open ${domains.slice(0, 4).join(", ")} will be automatically blocked and redirected to your focus timer.
`;

  return createZipBlob([
    { name: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { name: "rules.json", content: JSON.stringify(rules, null, 2) },
    { name: "background.js", content: backgroundJs },
    { name: "README.md", content: readmeMd },
  ]);
}

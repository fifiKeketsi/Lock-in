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

export function isFocusSessionActive(session: ActiveFocusSessionState | null = getActiveFocusSession()): boolean {
  if (!session || !session.running || session.phase !== "study") return false;
  if (session.endTime && session.endTime <= Date.now()) return false;
  // Ignore sessions that haven't been updated recently
  if (Date.now() - (session.updatedAt || 0) > 15_000) return false;
  return true;
}

export function syncShieldExtension(
  session: ActiveFocusSessionState | null = getActiveFocusSession(),
  blockedDomains: string[] = getSavedBlockedDomains()
) {
  if (typeof window === "undefined") return;
  try {
    const path = window.location.pathname;
    const isFocusOrRoomRoute = path === "/focus" || path.startsWith("/rooms/");
    const isActive = isFocusOrRoomRoute && isFocusSessionActive(session);
    window.postMessage(
      {
        source: "LOCKIN_WEB_APP",
        type: "LOCKIN_SHIELD_SYNC",
        isActive,
        session: isActive ? session : null,
        blockedDomains,
        appOrigin: window.location.origin,
      },
      "*"
    );
  } catch {}
}

export function saveActiveFocusSession(session: ActiveFocusSessionState) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...session, updatedAt: Date.now() };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next));
    syncShieldExtension(next);
  } catch {}
}

export function clearActiveFocusSession(mode?: "solo" | "room", roomId?: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getActiveFocusSession();
    if (!current) {
      syncShieldExtension(null);
      return;
    }
    if (mode && current.mode !== mode) return;
    if (roomId && current.roomId !== roomId) return;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    syncShieldExtension(null);
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
    syncShieldExtension(getActiveFocusSession(), domains);
  } catch {}
}

export function buildExtensionZip(blockedDomains: string[]): Blob {
  const domains = blockedDomains.length > 0 ? blockedDomains : ["instagram.com", "tiktok.com", "youtube.com"];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

  const manifest = {
    manifest_version: 3,
    name: "Lock-In Hard Distraction Shield",
    version: "2.1.0",
    description: "Dynamically blocks selected distraction sites ONLY during active Lock-In study sessions and unlocks automatically on breaks or when idle.",
    permissions: ["declarativeNetRequest", "storage", "alarms", "tabs"],
    host_permissions: ["<all_urls>"],
    background: {
      service_worker: "background.js",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        run_at: "document_start",
      },
    ],
    action: {
      default_title: "Lock-In Distraction Shield: Standby (Unlocked)",
    },
  };

  const contentJs = `// Lock-In Hard Distraction Shield - Content Script Bridge (v2.1)
(function () {
  const DEFAULT_ORIGIN = ${JSON.stringify(appOrigin)};
  const SESSION_KEY = "lockin.active_focus_session.v1";
  const BLOCKED_KEY = "lockin.blocked_apps.v2";
  let isConfirmedLockInPage = window.location.origin === DEFAULT_ORIGIN;

  function markInstalled() {
    try {
      if (document.documentElement) {
        document.documentElement.dataset.lockinShieldInstalled = "2.1.0";
      }
    } catch (e) {}
  }

  if (isConfirmedLockInPage) {
    markInstalled();
  }

  function isFocusOrRoomPath() {
    const p = window.location.pathname || "";
    return p === "/focus" || p.startsWith("/rooms/");
  }

  function readAndSyncState() {
    try {
      const rawSession = localStorage.getItem(SESSION_KEY);
      const rawBlocked = localStorage.getItem(BLOCKED_KEY);
      if (rawSession !== null || rawBlocked !== null) {
        isConfirmedLockInPage = true;
      }
      if (!isConfirmedLockInPage) return;

      markInstalled();

      const session = rawSession ? JSON.parse(rawSession) : null;
      const blockedDomains = rawBlocked ? JSON.parse(rawBlocked) : ${JSON.stringify(domains)};

      const now = Date.now();
      const isFresh = session && now - (session.updatedAt || 0) < 15000;
      const notExpired = session && (!session.endTime || session.endTime > now);
      const isActive = Boolean(
        isFocusOrRoomPath() &&
        isFresh &&
        notExpired &&
        session.running === true &&
        session.phase === "study"
      );

      chrome.runtime.sendMessage({
        type: "LOCKIN_SYNC_STATE",
        isActive,
        session: isActive ? session : null,
        blockedDomains: Array.isArray(blockedDomains) ? blockedDomains : ${JSON.stringify(domains)},
        appOrigin: window.location.origin,
      }).catch(() => {});
    } catch (e) {}
  }

  // Always listen for instant state updates posted by the Lock-In React app
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "LOCKIN_WEB_APP" || data.type !== "LOCKIN_SHIELD_SYNC") return;

    isConfirmedLockInPage = true;
    markInstalled();

    const activeOnRoute = Boolean(data.isActive && isFocusOrRoomPath());

    chrome.runtime.sendMessage({
      type: "LOCKIN_SYNC_STATE",
      isActive: activeOnRoute,
      session: activeOnRoute ? data.session : null,
      blockedDomains: Array.isArray(data.blockedDomains) ? data.blockedDomains : ${JSON.stringify(domains)},
      appOrigin: data.appOrigin || window.location.origin,
    }).catch(() => {});
  });

  window.addEventListener("pagehide", () => {
    if (!isConfirmedLockInPage) return;
    chrome.runtime.sendMessage({
      type: "LOCKIN_SYNC_STATE",
      isActive: false,
      session: null,
      appOrigin: window.location.origin,
    }).catch(() => {});
  });

  window.addEventListener("storage", readAndSyncState);
  window.addEventListener("focus", readAndSyncState);
  document.addEventListener("DOMContentLoaded", readAndSyncState);

  readAndSyncState();
  setInterval(readAndSyncState, 1500);
})();
`;

  const backgroundJs = `// Lock-In Hard Distraction Shield - Dynamic Background Service Worker (v2.1)
const DEFAULT_APP_ORIGIN = ${JSON.stringify(appOrigin)};
const DEFAULT_DOMAINS = ${JSON.stringify(domains)};
const ALARM_NAME = "lockin_study_phase_end";
const HEARTBEAT_ALARM = "lockin_heartbeat_check";

let shieldState = {
  isActive: false,
  blockedDomains: DEFAULT_DOMAINS,
  appOrigin: DEFAULT_APP_ORIGIN,
  originPath: "/focus",
  endTime: null,
  lastActiveSync: 0,
};

async function loadState() {
  try {
    const stored = await chrome.storage.local.get(["lockinShieldState"]);
    if (stored && stored.lockinShieldState) {
      shieldState = { ...shieldState, ...stored.lockinShieldState };
    }
  } catch (e) {}
  return shieldState;
}

async function saveState(next) {
  shieldState = { ...shieldState, ...next };
  try {
    await chrome.storage.local.set({ lockinShieldState: shieldState });
  } catch (e) {}
}

// Rebuilds dynamic declarativeNetRequest rules ONLY when a study session is actively running
async function applyDynamicRules(state) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    const now = Date.now();
    const shouldBlock = Boolean(
      state.isActive &&
      (!state.endTime || state.endTime > now) &&
      Array.isArray(state.blockedDomains) &&
      state.blockedDomains.length > 0
    );

    if (!shouldBlock) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: [],
      });
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({
        title: "Lock-In Distraction Shield: Standby (Unlocked)",
      });
      await chrome.alarms.clear(ALARM_NAME);
      return;
    }

    const origin = state.appOrigin || DEFAULT_APP_ORIGIN;
    let appHost = "localhost";
    try {
      appHost = new URL(origin).hostname;
    } catch (e) {}

    const excludedDomains = Array.from(new Set([appHost, "localhost", "127.0.0.1"]));
    const cleanDomains = state.blockedDomains.filter(
      (d) => d && !excludedDomains.includes(d.toLowerCase())
    );

    const addRules = cleanDomains.map((domain, idx) => ({
      id: idx + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          url: origin + "/focus?blocked=" + encodeURIComponent(domain),
        },
      },
      condition: {
        urlFilter: "||" + domain,
        resourceTypes: ["main_frame"],
        excludedRequestDomains: excludedDomains,
      },
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });

    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    await chrome.action.setTitle({
      title: "Lock-In Shield ARMED (" + addRules.length + " sites locked during study)",
    });

    if (state.endTime && state.endTime > now) {
      await chrome.alarms.create(ALARM_NAME, { when: state.endTime });
    }
  } catch (err) {
    console.warn("[Lock-In Shield] Failed to update dynamic rules:", err);
  }
}

async function verifyOpenTimerTabs() {
  try {
    await loadState();
    if (!shieldState.isActive) return;
    const allTabs = await chrome.tabs.query({});
    const origin = shieldState.appOrigin || DEFAULT_APP_ORIGIN;
    const hasActiveFocusOrRoomTab = allTabs.some((t) => {
      if (!t.url || !t.url.startsWith(origin)) return false;
      try {
        const u = new URL(t.url);
        return (
          !u.searchParams.has("blocked") &&
          (u.pathname === "/focus" || u.pathname.startsWith("/rooms/"))
        );
      } catch (e) {
        return false;
      }
    });

    if (!hasActiveFocusOrRoomTab) {
      await saveState({ isActive: false, endTime: null });
      await applyDynamicRules(shieldState);
    }
  } catch (e) {}
}

// Start in unlocked standby state on install/startup until an active focus timer arms it
chrome.runtime.onInstalled.addListener(async () => {
  await saveState({ isActive: false, endTime: null, lastActiveSync: 0 });
  await applyDynamicRules(shieldState);
  await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
});

chrome.runtime.onStartup.addListener(async () => {
  await saveState({ isActive: false, endTime: null, lastActiveSync: 0 });
  await applyDynamicRules(shieldState);
});

// Immediately ensure rules match current state when worker wakes up
loadState().then((s) => applyDynamicRules(s));

// Receive real-time state syncs from the Lock-In web app content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "LOCKIN_SYNC_STATE") {
    const session = message.session;
    const isActive = Boolean(message.isActive);
    const nextState = {
      isActive,
      blockedDomains:
        Array.isArray(message.blockedDomains) && message.blockedDomains.length > 0
          ? message.blockedDomains
          : shieldState.blockedDomains,
      appOrigin: message.appOrigin || shieldState.appOrigin || DEFAULT_APP_ORIGIN,
      originPath: (session && session.originPath) || "/focus",
      endTime: isActive && session ? session.endTime || null : null,
      lastActiveSync: isActive ? Date.now() : 0,
    };
    saveState(nextState).then(() => applyDynamicRules(nextState));
    sendResponse({ ok: true, isActive: nextState.isActive });
    return true;
  }
});

// Automatically disarm shield when study phase timer reaches 00:00 or tab closes
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await saveState({ isActive: false, endTime: null });
    await applyDynamicRules(shieldState);
  } else if (alarm.name === HEARTBEAT_ALARM) {
    await verifyOpenTimerTabs();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  verifyOpenTimerTabs();
});

// When a blocked domain redirects to /focus?blocked=..., return the user to their original active timer tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (!currentUrl) return;

  await verifyOpenTimerTabs();
  const origin = shieldState.appOrigin || DEFAULT_APP_ORIGIN;

  if (currentUrl.startsWith(origin) && currentUrl.includes("blocked=")) {
    try {
      const parsed = new URL(currentUrl);
      const blockedDomain = parsed.searchParams.get("blocked");

      // Safety check: if not currently in an active study block, disarm rules and let navigation through
      if (!shieldState.isActive || (shieldState.endTime && shieldState.endTime <= Date.now())) {
        await saveState({ isActive: false, endTime: null });
        await applyDynamicRules(shieldState);
        if (blockedDomain) {
          await chrome.tabs.update(tabId, { url: "https://" + blockedDomain });
        }
        return;
      }

      const allTabs = await chrome.tabs.query({});
      const existingTimerTab = allTabs.find(
        (t) =>
          t.id !== tabId &&
          t.url &&
          t.url.startsWith(origin) &&
          !t.url.includes("blocked=") &&
          (t.url.includes("/focus") || t.url.includes("/rooms/"))
      );

      if (existingTimerTab && existingTimerTab.id != null) {
        if (existingTimerTab.windowId != null) {
          await chrome.windows.update(existingTimerTab.windowId, { focused: true });
        }
        await chrome.tabs.update(existingTimerTab.id, { active: true });
        await chrome.tabs.remove(tabId);
      } else if (shieldState.originPath && shieldState.originPath !== "/focus") {
        const targetUrl = new URL(origin + shieldState.originPath);
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

  const readmeMd = `# Lock-In Hard Distraction Shield v2.1 (Chrome / Edge / Brave Extension)

This extension dynamically blocks your selected distraction sites **only while a Lock-In study timer is actively running**, and automatically unlocks them during breaks or when your timer is stopped.

### 30-Second Quick Setup / Update:
1. Unzip this downloaded archive into a folder on your computer.
2. In Google Chrome, Microsoft Edge, or Brave, navigate to:
   - **Chrome**: \`chrome://extensions\`
   - **Edge**: \`edge://extensions\`
   - **Brave**: \`brave://extensions\`
3. Turn on **"Developer mode"** in the top-right corner.
4. **IMPORTANT**: Click **"Remove"** on any older version of "Lock-In Hard Distraction Shield", then click **"Load unpacked"** and select this newly unzipped folder.
5. Refresh your Lock-In tab. Notice the extension badge says **"ON"** only while a Study timer is running, and automatically turns off when paused, on break, or idle!
`;

  return createZipBlob([
    { name: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { name: "content.js", content: contentJs },
    { name: "background.js", content: backgroundJs },
    { name: "README.md", content: readmeMd },
  ]);
}

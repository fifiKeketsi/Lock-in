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

  const manifest = {
    manifest_version: 3,
    name: "Lock-In Hard Distraction Shield",
    version: "1.2.0",
    description: "Hard-blocks social media, video platforms, and mobile distraction sites during active focus sessions and study rooms.",
    permissions: ["declarativeNetRequest", "storage", "alarms"],
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
        url: `http://localhost:5173/focus?blocked=${encodeURIComponent(d)}`,
      },
    },
    condition: {
      urlFilter: `||${d}`,
      resourceTypes: ["main_frame"],
    },
  }));

  const backgroundJs = `// Lock-In Hard Distraction Shield - Background Service Worker
console.log("[Lock-In Shield] Initialized with active rules for ${domains.length} blocked platforms.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Lock-In Shield] Extension loaded. Focus protection armed.");
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

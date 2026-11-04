import { useState } from "react";
import { type DistractionApp, DEFAULT_APPS } from "@/lib/app-blocking";
import { Shield, ShieldAlert, Plus, Check, Download, X } from "lucide-react";

interface HardBlockSelectorProps {
  blockedDomains: string[];
  onChange: (domains: string[]) => void;
  isLocked?: boolean;
  onDownloadExtension: () => void;
}

export function HardBlockSelector({
  blockedDomains,
  onChange,
  isLocked = false,
  onDownloadExtension,
}: HardBlockSelectorProps) {
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState("");

  const toggleDomain = (domain: string) => {
    if (isLocked) return;
    if (blockedDomains.includes(domain)) {
      onChange(blockedDomains.filter((d) => d !== domain));
    } else {
      onChange([...blockedDomains, domain]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    let clean = customInput.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "");
    if (!clean || !clean.includes(".")) {
      setError("Enter a valid domain name (e.g. reddit.com)");
      return;
    }
    setError("");
    if (!blockedDomains.includes(clean)) {
      onChange([...blockedDomains, clean]);
    }
    setCustomInput("");
  };

  const handleSelectPreset = (type: "all" | "social" | "video" | "clear") => {
    if (isLocked) return;
    if (type === "all") {
      onChange(DEFAULT_APPS.map((a) => a.domain));
    } else if (type === "social") {
      onChange(DEFAULT_APPS.filter((a) => a.category === "social").map((a) => a.domain));
    } else if (type === "video") {
      onChange(DEFAULT_APPS.filter((a) => a.category === "video").map((a) => a.domain));
    } else if (type === "clear") {
      onChange([]);
    }
  };

  const socialApps = DEFAULT_APPS.filter((a) => a.category === "social");
  const videoApps = DEFAULT_APPS.filter((a) => a.category === "video");
  const gameApps = DEFAULT_APPS.filter((a) => a.category === "gaming");

  // Custom domains that aren't in DEFAULT_APPS
  const customDomains = blockedDomains.filter((d) => !DEFAULT_APPS.some((a) => a.domain === d));

  return (
    <div className="sfb-card p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isLocked ? (
              <ShieldAlert className="size-5 text-[#ef4444] animate-pulse" />
            ) : (
              <Shield className="size-5 text-[#f98538]" />
            )}
            <h3 className="font-display text-base font-bold text-foreground">
              Hard App Distraction Shield
            </h3>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isLocked
                  ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                  : "sfb-badge-lemon"
              }`}
            >
              {isLocked ? "Shield Armed & Locked" : `${blockedDomains.length} Armed`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isLocked
              ? "Distracting apps are strictly locked during active work blocks. They unlock automatically when your break timer begins."
              : "Choose the apps and websites that steal your attention. When the timer runs, access will be blocked until your break."}
          </p>
        </div>

        <button
          onClick={onDownloadExtension}
          type="button"
          className="sfb-btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 font-semibold"
          title="Download Chrome/Edge extension with these configured rules"
        >
          <Download className="size-3.5" />
          <span>Get Shield Extension</span>
        </button>
      </div>

      {/* Preset Quick Selectors */}
      {!isLocked && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
          <span className="text-[11px] font-bold text-muted-foreground mr-1.5">Presets:</span>
          <button
            type="button"
            onClick={() => handleSelectPreset("all")}
            className="rounded-full px-3 py-1 text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            🔥 Hard Mode (All Apps)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset("social")}
            className="rounded-full px-3 py-1 text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            📱 Social Media Only
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset("video")}
            className="rounded-full px-3 py-1 text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            🎬 Video & Streaming
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset("clear")}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* App Categories Grid */}
      <div className="space-y-4">
        {/* Social Category */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>Social Media</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {socialApps.map((app) => (
              <AppBadge
                key={app.id}
                app={app}
                selected={blockedDomains.includes(app.domain)}
                onToggle={() => toggleDomain(app.domain)}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>

        {/* Video & Streaming Category */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>Video & Streaming</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {videoApps.map((app) => (
              <AppBadge
                key={app.id}
                app={app}
                selected={blockedDomains.includes(app.domain)}
                onToggle={() => toggleDomain(app.domain)}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>

        {/* Gaming & Chat Category */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>Games & Communication</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gameApps.map((app) => (
              <AppBadge
                key={app.id}
                app={app}
                selected={blockedDomains.includes(app.domain)}
                onToggle={() => toggleDomain(app.domain)}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>

        {/* Custom Domains */}
        {customDomains.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Custom Blocked Sites</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {customDomains.map((dom) => (
                <span
                  key={dom}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    isLocked
                      ? "border-[#ef4444]/40 bg-[#ef4444]/10 text-foreground"
                      : "border-foreground bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919]"
                  }`}
                >
                  <span>🌐 {dom}</span>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => toggleDomain(dom)}
                      className="hover:opacity-75 focus:outline-none"
                      aria-label={`Remove ${dom}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Site Input */}
      {!isLocked && (
        <form onSubmit={handleAddCustom} className="pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Block custom website (e.g. news.ycombinator.com)"
              className="flex-1 min-w-[220px] h-9 rounded-full border border-border bg-card px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              type="submit"
              className="sfb-btn-secondary text-xs h-9 px-4 inline-flex items-center gap-1 font-semibold"
            >
              <Plus className="size-3.5" />
              <span>Add Site</span>
            </button>
          </div>
          {error && <p className="text-[11px] text-[#dc2626] font-semibold mt-1.5 pl-2">{error}</p>}
        </form>
      )}
    </div>
  );
}

function AppBadge({
  app,
  selected,
  onToggle,
  isLocked,
}: {
  app: DistractionApp;
  selected: boolean;
  onToggle: () => void;
  isLocked: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLocked}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-150 ${
        selected
          ? isLocked
            ? "border-[#ef4444]/60 bg-[#ef4444]/15 text-foreground shadow-xs"
            : "border-transparent bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919] shadow-xs scale-102"
          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border/80"
      } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
    >
      <span className="text-sm leading-none">{app.icon}</span>
      <span>{app.name}</span>
      {selected ? (
        <Check className={`size-3 stroke-[3] ${isLocked ? "text-[#ef4444]" : ""}`} />
      ) : (
        <span className="size-1 rounded-full bg-muted-foreground/40 ml-0.5" />
      )}
    </button>
  );
}

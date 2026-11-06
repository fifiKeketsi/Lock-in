import {
  DEFAULT_APPS,
  isFocusSessionActive,
  buildExtensionZip,
  type ActiveFocusSessionState,
} from "../app-blocking";
import { calculateNextStreak, evaluateBadges, formatDeadline } from "../store";
import { normalizeRoomId, generateRoomId } from "../rooms";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runLockInVerificationSuite(): { passed: number; results: string[] } {
  const results: string[] = [];

  // 1. Streak Calculation Verification (Same-day idempotency, consecutive increment, missed-day reset)
  assert(
    calculateNextStreak(0, undefined, "2026-11-01") === 1,
    "First task completion initializes streak to 1"
  );
  assert(
    calculateNextStreak(3, "2026-11-05", "2026-11-05") === 3,
    "Same-day task completion is idempotent and does not double-increment streak"
  );
  assert(
    calculateNextStreak(3, "2026-11-05", "2026-11-06") === 4,
    "Consecutive-day task completion increments streak by 1"
  );
  assert(
    calculateNextStreak(5, "2026-11-01", "2026-11-06") === 1,
    "Skipping more than 1 calendar day resets streak to 1"
  );
  results.push("Streak calculation & idempotency rules verified");

  // 2. Milestone Badge Evaluation Verification
  const b1 = evaluateBadges([], 1, 1);
  assert(b1.includes("First Step") && b1.length === 1, "Unlocks 'First Step' at 1 completed task");

  const b5 = evaluateBadges(b1, 5, 2);
  assert(b5.includes("On a Roll") && b5.length === 2, "Unlocks 'On a Roll' at 5 completed tasks");

  const b10 = evaluateBadges(b5, 10, 3);
  assert(
    b10.includes("Locked In") && b10.includes("3-Day Streak") && b10.length === 4,
    "Unlocks 'Locked In' at 10 tasks and '3-Day Streak' at 3 consecutive days without duplicates"
  );
  results.push("Milestone badge unlocking & deduplication rules verified");

  // 3. Hard App Block & Active Focus Session Gating Verification
  assert(!isFocusSessionActive(null), "Null focus session is inactive");

  const activeStudySession: ActiveFocusSessionState = {
    mode: "solo",
    originPath: "/focus",
    running: true,
    phase: "study",
    studyDuration: 25,
    breakDuration: 5,
    endTime: Date.now() + 60_000,
    remainingSec: 60,
    nudgesTriggered: 0,
    updatedAt: Date.now(),
  };
  assert(isFocusSessionActive(activeStudySession), "Running study session with future endTime is active");
  assert(
    !isFocusSessionActive({ ...activeStudySession, phase: "break" }),
    "Break phase disarms Hard App Distraction Shield"
  );
  assert(
    !isFocusSessionActive({ ...activeStudySession, running: false }),
    "Paused timer disarms Hard App Distraction Shield"
  );
  assert(
    !isFocusSessionActive({ ...activeStudySession, endTime: Date.now() - 1000 }),
    "Expired timer disarms Hard App Distraction Shield"
  );
  results.push("Hard Distraction Shield active session gating verified");

  // 4. In-Browser Manifest V3 Extension ZIP Generator Verification
  const zipBlob = buildExtensionZip(["instagram.com", "tiktok.com"]);
  assert(zipBlob instanceof Blob && zipBlob.size > 500, "Generated Chrome Extension ZIP is a non-empty binary Blob");
  assert(DEFAULT_APPS.length >= 10, "Default distraction app catalog is populated");
  results.push("Manifest V3 Chrome Extension binary ZIP generation verified");

  // 5. Study Room ID Normalization & Generation Verification
  assert(
    normalizeRoomId("  AbC123  ") === "abc123",
    "normalizeRoomId trims whitespace and lowercases room codes"
  );
  const generatedId = generateRoomId();
  assert(
    generatedId.length === 6 && generatedId === generatedId.toLowerCase(),
    "generateRoomId produces a 6-character lowercase code"
  );
  results.push("Study Room ID normalization & generation verified");

  // 6. Deadline Formatting Verification
  const overdueStr = formatDeadline(new Date(Date.now() - 172_800_000).toISOString());
  assert(overdueStr === "Overdue", "Past deadlines format as 'Overdue'");
  results.push("Task deadline formatting verified");

  return { passed: results.length, results };
}


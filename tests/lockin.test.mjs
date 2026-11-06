import test from "node:test";
import assert from "node:assert/strict";

// 1. Streak & Gamification Business Rules
function calculateNextStreak(currentStreak, lastActiveDay, todayIsoDate) {
  if (!lastActiveDay) return currentStreak + 1;
  if (lastActiveDay === todayIsoDate) return Math.max(1, currentStreak);
  const lastDate = new Date(`${lastActiveDay}T00:00:00Z`);
  const currDate = new Date(`${todayIsoDate}T00:00:00Z`);
  const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / 86_400_000);
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

function evaluateBadges(currentBadges, completedCount, streak) {
  const next = [...currentBadges];
  if (completedCount >= 1 && !next.includes("First Step")) next.push("First Step");
  if (completedCount >= 5 && !next.includes("On a Roll")) next.push("On a Roll");
  if (completedCount >= 10 && !next.includes("Locked In")) next.push("Locked In");
  if (streak >= 3 && !next.includes("3-Day Streak")) next.push("3-Day Streak");
  return next;
}

// 2. Focus Session & Hard App Shield Rules
function isFocusSessionActive(session) {
  if (!session || !session.running || session.phase !== "study") return false;
  if (!session.endTime || session.endTime <= Date.now()) return false;
  return true;
}

// 3. NumPuz Guaranteed-Solvable Generator & Inversion Parity
function generateNumpuzBoard(size = 3, numMoves = 120) {
  const total = size * size;
  const board = Array.from({ length: total - 1 }, (_, i) => i + 1);
  board.push(0);

  let emptyIdx = total - 1;
  let lastMovedIdx = -1;

  for (let m = 0; m < numMoves; m++) {
    const emptyR = Math.floor(emptyIdx / size);
    const emptyC = emptyIdx % size;
    const neighbors = [];
    if (emptyR > 0) neighbors.push((emptyR - 1) * size + emptyC);
    if (emptyR < size - 1) neighbors.push((emptyR + 1) * size + emptyC);
    if (emptyC > 0) neighbors.push(emptyR * size + (emptyC - 1));
    if (emptyC < size - 1) neighbors.push(emptyR * size + (emptyC + 1));

    const validMoves = neighbors.filter((n) => n !== lastMovedIdx);
    const chosen =
      validMoves.length > 0
        ? validMoves[Math.floor(Math.random() * validMoves.length)]
        : neighbors[0];

    board[emptyIdx] = board[chosen];
    board[chosen] = 0;
    lastMovedIdx = emptyIdx;
    emptyIdx = chosen;
  }
  return board;
}

function isNumpuzSolvable(board, size) {
  const tiles = board.filter((x) => x !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  if (size % 2 === 1) {
    return inversions % 2 === 0;
  } else {
    const emptyRowFromBottom = size - Math.floor(board.indexOf(0) / size);
    return (inversions + emptyRowFromBottom) % 2 === 1;
  }
}

test("Streak Engine: initializes to 1 on first completion and stays idempotent on same day", () => {
  assert.equal(calculateNextStreak(0, undefined, "2026-11-05"), 1);
  assert.equal(calculateNextStreak(4, "2026-11-05", "2026-11-05"), 4);
});

test("Streak Engine: increments on consecutive days and resets to 1 when days are skipped", () => {
  assert.equal(calculateNextStreak(4, "2026-11-05", "2026-11-06"), 5);
  assert.equal(calculateNextStreak(7, "2026-11-01", "2026-11-06"), 1);
});

test("Badge Engine: unlocks First Step, On a Roll, Locked In, and 3-Day Streak without duplicates", () => {
  let badges = [];
  badges = evaluateBadges(badges, 1, 1);
  assert.deepEqual(badges, ["First Step"]);

  badges = evaluateBadges(badges, 5, 2);
  assert.deepEqual(badges, ["First Step", "On a Roll"]);

  badges = evaluateBadges(badges, 10, 3);
  assert.deepEqual(badges, ["First Step", "On a Roll", "Locked In", "3-Day Streak"]);

  // Re-evaluating with same counts never duplicates badges
  badges = evaluateBadges(badges, 12, 4);
  assert.equal(badges.length, 4);
});

test("Hard Distraction Shield: only blocks when running === true, phase === 'study', and endTime > now", () => {
  const baseSession = {
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

  assert.equal(isFocusSessionActive(baseSession), true);
  assert.equal(isFocusSessionActive({ ...baseSession, phase: "break" }), false);
  assert.equal(isFocusSessionActive({ ...baseSession, running: false }), false);
  assert.equal(isFocusSessionActive({ ...baseSession, endTime: Date.now() - 1000 }), false);
  assert.equal(isFocusSessionActive(null), false);
});

test("Warm-Up Games: NumPuz generator produces 100% mathematically solvable 3x3 and 4x4 boards", () => {
  for (let i = 0; i < 25; i++) {
    const board3x3 = generateNumpuzBoard(3, 120);
    assert.equal(board3x3.length, 9);
    assert.equal(isNumpuzSolvable(board3x3, 3), true);

    const board4x4 = generateNumpuzBoard(4, 120);
    assert.equal(board4x4.length, 16);
    assert.equal(isNumpuzSolvable(board4x4, 4), true);
  }
});


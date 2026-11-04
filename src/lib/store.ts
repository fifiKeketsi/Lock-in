import { useCallback, useSyncExternalStore } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type Theme = "light" | "dark" | "system";

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  deadline: string; // ISO or Timestamp
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface MoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: "morning" | "evening";
  energy: number; // 1-5
  note?: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  startedAt: string;
  durationMin: number;
  rating?: number;
  difficulty?: number;
  feedback?: string;
}

export interface PetState {
  name: string;
  happiness: number; // 0-100
  level: number;
  xp: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LockInState {
  tasks: Task[];
  moods: MoodEntry[];
  sessions: FocusSession[];
  pet: PetState;
  points: number;
  streak: number;
  lastActiveDay?: string;
  badges: string[];
  theme: Theme;
  user: User | null;
}

const THEME_KEY = "lockin.theme.v1";
const USER_KEY = "lockin.user.v2";
const LEGACY_STATE_KEY = "lockin.state.v2";

function getUserStateKey(userId: string): string {
  return `lockin.userdata.v3.uid.${userId}`;
}

function getUserEmailKey(email: string): string {
  return `lockin.userdata.v3.email.${email.trim().toLowerCase()}`;
}

function getDefaultTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  
  if (theme === "system") {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(systemPrefersDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

const defaultState: LockInState = {
  tasks: [],
  moods: [],
  sessions: [],
  pet: { name: "Pip", happiness: 80, level: 1, xp: 0 },
  points: 0,
  streak: 0,
  badges: [],
  theme: getDefaultTheme(),
  user: null,
};

function sanitizeLoadedState(data: any): Partial<LockInState> {
  if (!data || typeof data !== "object") return {};
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    moods: Array.isArray(data.moods) ? data.moods : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    pet: data.pet
      ? {
          name: typeof data.pet.name === "string" ? data.pet.name : defaultState.pet.name,
          happiness: typeof data.pet.happiness === "number" ? data.pet.happiness : defaultState.pet.happiness,
          level: typeof data.pet.level === "number" ? data.pet.level : defaultState.pet.level,
          xp: typeof data.pet.xp === "number" ? data.pet.xp : defaultState.pet.xp,
        }
      : defaultState.pet,
    points: typeof data.points === "number" ? data.points : 0,
    streak: typeof data.streak === "number" ? data.streak : 0,
    lastActiveDay: typeof data.lastActiveDay === "string" ? data.lastActiveDay : undefined,
    badges: Array.isArray(data.badges) ? data.badges : [],
  };
}

function saveUserState(userId: string, email: string | undefined, data: Partial<LockInState>) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload = JSON.stringify({
      tasks: data.tasks ?? [],
      moods: data.moods ?? [],
      sessions: data.sessions ?? [],
      pet: data.pet ?? defaultState.pet,
      points: data.points ?? 0,
      streak: data.streak ?? 0,
      lastActiveDay: data.lastActiveDay ?? null,
      badges: data.badges ?? [],
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(getUserStateKey(userId), payload);
    if (email) {
      localStorage.setItem(getUserEmailKey(email), payload);
    }
  } catch (err) {
    console.warn("Error saving user state to localStorage:", err);
  }
}

function loadUserState(userId: string, email?: string): Partial<LockInState> | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    // 1. Try UID-based storage
    const uidData = localStorage.getItem(getUserStateKey(userId));
    if (uidData) {
      const parsed = JSON.parse(uidData);
      return sanitizeLoadedState(parsed);
    }

    // 2. Try Email-based storage
    if (email) {
      const emailData = localStorage.getItem(getUserEmailKey(email));
      if (emailData) {
        const parsed = JSON.parse(emailData);
        // Link to UID key for fast future lookups
        localStorage.setItem(getUserStateKey(userId), emailData);
        return sanitizeLoadedState(parsed);
      }
    }

    // 3. Fallback: check legacy storage
    const legacy = localStorage.getItem(LEGACY_STATE_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      const hasContent =
        (Array.isArray(parsedLegacy.tasks) && parsedLegacy.tasks.length > 0) ||
        (Array.isArray(parsedLegacy.moods) && parsedLegacy.moods.length > 0) ||
        (Array.isArray(parsedLegacy.sessions) && parsedLegacy.sessions.length > 0) ||
        (typeof parsedLegacy.points === "number" && parsedLegacy.points > 0) ||
        (typeof parsedLegacy.streak === "number" && parsedLegacy.streak > 0) ||
        (Array.isArray(parsedLegacy.badges) && parsedLegacy.badges.length > 0);

      if (hasContent) {
        const sanitized = sanitizeLoadedState(parsedLegacy);
        saveUserState(userId, email, sanitized);
        return sanitized;
      }
    }
  } catch (err) {
    console.warn("Error reading user state from localStorage:", err);
  }
  return null;
}

function loadCachedState(): LockInState {
  if (typeof window === "undefined") return defaultState;
  try {
    const savedUserStr = localStorage.getItem(USER_KEY);
    const parsedUser: User | null = savedUserStr ? JSON.parse(savedUserStr) : null;
    if (parsedUser && parsedUser.id) {
      const userSavedData = loadUserState(parsedUser.id, parsedUser.email);
      if (userSavedData) {
        return {
          ...defaultState,
          ...userSavedData,
          theme: getDefaultTheme(),
          user: parsedUser,
        };
      }
      return {
        ...defaultState,
        theme: getDefaultTheme(),
        user: parsedUser,
      };
    }
    return {
      ...defaultState,
      theme: getDefaultTheme(),
      user: null,
    };
  } catch {
    return defaultState;
  }
}

// Global in-memory state & listeners
let memory: LockInState = loadCachedState();
const subscribers = new Set<() => void>();

function notifySubscribers() {
  if (typeof window !== "undefined") {
    try {
      if (memory.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(memory.user));
        saveUserState(memory.user.id, memory.user.email, memory);
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  subscribers.forEach((fn) => fn());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function getSnapshot(): LockInState {
  return memory;
}

function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== "object") return val;
  if (val instanceof Timestamp) return val;
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      result[k] = sanitizeForFirestore(v);
    }
  }
  return result;
}

async function saveStateToFirestore(userId: string) {
  if (!userId) return;
  try {
    const docRef = doc(db, "users", userId);
    const dataToSave = sanitizeForFirestore({
      tasks: memory.tasks,
      moods: memory.moods,
      sessions: memory.sessions,
      pet: memory.pet,
      points: memory.points,
      streak: memory.streak,
      lastActiveDay: memory.lastActiveDay ?? null,
      badges: memory.badges,
      user: memory.user,
      updatedAt: Timestamp.now(),
    });

    await Promise.race([
      setDoc(docRef, dataToSave, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);
  } catch (err) {
    console.warn("Firestore sync skipped:", err);
  }
}

async function loadStateFromFirestore(userId: string): Promise<Partial<LockInState> | null> {
  if (!userId) return null;
  try {
    const docRef = doc(db, "users", userId);
    const docSnap: any = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);
    if (docSnap && docSnap.exists()) {
      return sanitizeLoadedState(docSnap.data());
    }
  } catch (err) {
    console.warn("Firestore load skipped (using local cache):", err);
  }
  return null;
}

function setState(updater: (s: LockInState) => LockInState) {
  memory = updater(memory);
  notifySubscribers();
  if (memory.user) {
    saveStateToFirestore(memory.user.id);
  }
}

// Initialize Global Auth & Theme listener once
if (typeof window !== "undefined") {
  applyTheme(memory.theme);

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || memory.user?.name || firebaseUser.email?.split("@")[0] || "User",
      };

      // Check if we have saved local state for this returning user
      const localData = loadUserState(user.id, user.email);
      if (localData) {
        memory = {
          ...defaultState,
          ...localData,
          user,
          theme: memory.theme,
        };
      } else if (!memory.user || memory.user.id !== user.id) {
        memory = {
          ...defaultState,
          user,
          theme: memory.theme,
        };
      } else {
        memory = {
          ...memory,
          user,
        };
      }
      notifySubscribers();

      // Background load data from Firestore (if available)
      loadStateFromFirestore(user.id).then((remoteData) => {
        if (remoteData) {
          memory = {
            ...memory,
            ...remoteData,
            user,
            theme: memory.theme,
          };
          saveUserState(user.id, user.email, memory);
          notifySubscribers();
        }
      });
    } else {
      // Firebase auth state has no user; if no cached user exists in localStorage, clear memory
      const cached = localStorage.getItem(USER_KEY);
      if (!cached && memory.user) {
        memory = { ...defaultState, user: null };
        notifySubscribers();
      }
    }
  });

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    if (memory.theme === "system") {
      applyTheme("system");
    }
  });
}

function formatAuthError(err: any): string {
  const code = err?.code || "";
  if (code === "auth/configuration-not-found") {
    return "Firebase Email/Password provider is not enabled in Firebase Console. Please go to Firebase Console -> Build -> Authentication -> Sign-in method, select Email/Password, and click Enable.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account already exists with this email address. Please log in instead.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Incorrect email or password. Please try again.";
  }
  if (code === "auth/user-not-found") {
    return "No account found with this email. Please register first.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This website domain is not authorized in Firebase. Please add your Netlify URL in Firebase Console -> Build -> Authentication -> Settings -> Authorized domains.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Please check your internet connection.";
  }
  return err?.message || "Authentication failed. Please try again.";
}

export function useLockIn() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);

  const addTask = useCallback((t: Omit<Task, "id" | "createdAt" | "status">) => {
    if (!memory.user) {
      alert("Please log in or register an account to create tasks.");
      return;
    }
    setState((s) => ({
      ...s,
      tasks: [
        { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "pending" },
        ...s.tasks,
      ],
    }));
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    if (!memory.user) return;
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const completeTask = useCallback((id: string) => {
    if (!memory.user) {
      alert("Please log in or register an account to complete tasks and earn points.");
      return;
    }
    setState((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const streak = s.lastActiveDay === today ? s.streak : s.streak + 1;
      const xp = s.pet.xp + 20;
      const level = 1 + Math.floor(xp / 100);
      const newBadges = [...s.badges];
      const completedCount = s.tasks.filter((t) => t.status === "completed").length + 1;
      if (completedCount === 1 && !newBadges.includes("First Step")) newBadges.push("First Step");
      if (completedCount === 5 && !newBadges.includes("On a Roll")) newBadges.push("On a Roll");
      if (completedCount === 10 && !newBadges.includes("Locked In")) newBadges.push("Locked In");
      if (streak === 3 && !newBadges.includes("3-Day Streak")) newBadges.push("3-Day Streak");
      return {
        ...s,
        points: s.points + 15,
        streak,
        lastActiveDay: today,
        badges: newBadges,
        pet: {
          ...s.pet,
          xp,
          level,
          happiness: Math.min(100, s.pet.happiness + 8),
        },
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, status: "completed", completedAt: new Date().toISOString() } : t
        ),
      };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    if (!memory.user) return;
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const addMood = useCallback((m: Omit<MoodEntry, "id">) => {
    if (!memory.user) {
      alert("Please log in or register an account to log daily check-ins.");
      return;
    }
    setState((s) => ({ ...s, moods: [{ ...m, id: crypto.randomUUID() }, ...s.moods] }));
  }, []);

  const addSession = useCallback((sess: Omit<FocusSession, "id">) => {
    if (!memory.user) {
      alert("Please log in or register an account to record focus sessions.");
      return;
    }
    setState((s) => ({
      ...s,
      sessions: [{ ...sess, id: crypto.randomUUID() }, ...s.sessions],
      points: s.points + Math.round(sess.durationMin / 5),
      pet: { ...s.pet, happiness: Math.min(100, s.pet.happiness + 3) },
    }));
  }, []);

  const renamePet = useCallback((name: string) => {
    if (!memory.user) return;
    setState((s) => ({ ...s, pet: { ...s.pet, name } }));
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    setState((s) => ({ ...s, theme }));
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const user: User = { id: firebaseUser.uid, email, name: name.trim() || email.split("@")[0] };
      
      // New user registering starts with fresh default state
      const freshState: LockInState = {
        ...defaultState,
        user,
        theme: memory.theme,
      };
      memory = freshState;
      saveUserState(user.id, user.email, memory);
      notifySubscribers();

      // Non-blocking firestore save
      saveStateToFirestore(user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      };

      // Check for returning user's saved progress
      const localData = loadUserState(user.id, user.email);
      if (localData) {
        // Returning user: restore all their progress!
        memory = {
          ...defaultState,
          ...localData,
          user,
          theme: memory.theme,
        };
      } else {
        // New to this device or fresh account
        memory = {
          ...defaultState,
          user,
          theme: memory.theme,
        };
      }
      notifySubscribers();

      // Background load from Firestore in case state was saved remotely
      loadStateFromFirestore(user.id).then((remoteData) => {
        if (remoteData) {
          memory = {
            ...memory,
            ...remoteData,
            user,
            theme: memory.theme,
          };
          saveUserState(user.id, user.email, memory);
          notifySubscribers();
        }
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (memory.user) {
        // Save current user progress before signing out
        saveUserState(memory.user.id, memory.user.email, memory);
        await saveStateToFirestore(memory.user.id);
      }
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Reset memory to logged out state without wiping the user's stored progress
      memory = { ...defaultState, user: null };
      notifySubscribers();
    }
  }, []);

  return {
    state,
    addTask,
    updateTask,
    completeTask,
    deleteTask,
    addMood,
    addSession,
    renamePet,
    setTheme,
    register,
    login,
    logout,
  };
}

export function formatDeadline(iso: string) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const now = new Date();
  const today = now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400000).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === tomorrow) return "Tomorrow";
  if (diff < 0) return "Overdue";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

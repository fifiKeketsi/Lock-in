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
const STATE_KEY = "lockin.state.v2";
const USER_KEY = "lockin.user.v2";

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

function loadCachedState(): LockInState {
  if (typeof window === "undefined") return defaultState;
  try {
    const savedState = localStorage.getItem(STATE_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    const parsedState = savedState ? JSON.parse(savedState) : {};
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    return {
      ...defaultState,
      ...parsedState,
      theme: getDefaultTheme(),
      user: parsedUser,
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
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          tasks: memory.tasks,
          moods: memory.moods,
          sessions: memory.sessions,
          pet: memory.pet,
          points: memory.points,
          streak: memory.streak,
          lastActiveDay: memory.lastActiveDay,
          badges: memory.badges,
        })
      );
      if (memory.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(memory.user));
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

async function saveStateToFirestore(userId: string) {
  try {
    const docRef = doc(db, "users", userId);
    await Promise.race([
      setDoc(
        docRef,
        {
          tasks: memory.tasks,
          moods: memory.moods,
          sessions: memory.sessions,
          pet: memory.pet,
          points: memory.points,
          streak: memory.streak,
          lastActiveDay: memory.lastActiveDay,
          badges: memory.badges,
          user: memory.user,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);
  } catch (err) {
    console.warn("Firestore sync skipped:", err);
  }
}

async function loadStateFromFirestore(userId: string): Promise<Partial<LockInState> | null> {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap: any = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);
    if (docSnap && docSnap.exists()) {
      return docSnap.data();
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
      // Immediately set user in memory so UI reveals logged-in status with 0ms delay
      memory = { ...memory, user };
      notifySubscribers();

      // Background load data from Firestore (if available)
      loadStateFromFirestore(user.id).then((remoteData) => {
        if (remoteData) {
          memory = {
            ...memory,
            ...remoteData,
            user, // Keep guaranteed valid user
            theme: memory.theme,
          };
          notifySubscribers();
        }
      });
    } else {
      memory = { ...defaultState, user: null };
      notifySubscribers();
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
      memory = { ...memory, user };
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
        name: firebaseUser.displayName || memory.user?.name || email.split("@")[0],
      };
      // Immediately set user and notify subscribers BEFORE returning
      memory = { ...memory, user };
      notifySubscribers();
      // Background load
      loadStateFromFirestore(user.id).then((remoteData) => {
        if (remoteData) {
          memory = { ...memory, ...remoteData, user };
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
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
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

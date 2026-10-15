import { useEffect, useState, useCallback } from "react";
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

let memory: LockInState = defaultState;
const subscribers = new Set<() => void>();

async function saveStateToFirestore(userId: string) {
  try {
    const docRef = doc(db, "users", userId);
    await setDoc(docRef, {
      ...memory,
      user: memory.user, // Keep user data
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (err) {
    console.error("Error saving state to Firestore:", err);
  }
}

async function loadStateFromFirestore(userId: string) {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...defaultState,
        ...data,
        theme: getDefaultTheme(),
      } as LockInState;
    } else {
      // New user - save default state
      await saveStateToFirestore(userId);
      return defaultState;
    }
  } catch (err) {
    console.error("Error loading state from Firestore:", err);
    return defaultState;
  }
}

function setState(updater: (s: LockInState) => LockInState) {
  const newState = updater(memory);
  memory = newState;
  // Save to Firestore if user is logged in
  if (memory.user) {
    saveStateToFirestore(memory.user.id);
  }
  subscribers.forEach((fn) => fn());
}

export function useLockIn() {
  const [, force] = useState(0);

  useEffect(() => {
    // Initialize theme
    applyTheme(memory.theme);
    force((n) => n + 1);

    // Auth listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Logged in - load from Firestore
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "You",
        };
        const firestoreState = await loadStateFromFirestore(user.id);
        memory = { ...firestoreState, user };
      } else {
        // Not logged in - reset state
        memory = { ...defaultState, user: null };
      }
      applyTheme(memory.theme);
      force((n) => n + 1);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (memory.theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      unsubscribeAuth();
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

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
    setState((s) => ({ ...s, theme }));
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }, []);

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

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      const firebaseUser = userCredential.user;
      // Create user in Firestore
      const user: User = { id: firebaseUser.uid, email, name };
      memory.user = user;
      await saveStateToFirestore(user.id);
      setState((s) => ({ ...s, user }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setState((s) => ({ ...s, user: null }));
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  return {
    state: memory,
    addTask, updateTask, completeTask, deleteTask,
    addMood, addSession, renamePet,
    setTheme, register, login, logout,
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

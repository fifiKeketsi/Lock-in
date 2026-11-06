import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Load Firebase configuration from environment variables with fallback defaults for seamless local/CI builds
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDjhCmzL2EdijsLzaAy2vhMzsxO40_eR2I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-app-1510c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-app-1510c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-app-1510c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "568372587517",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:568372587517:web:3253b97d0db39248f3c794",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-EMYW1LZVHT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

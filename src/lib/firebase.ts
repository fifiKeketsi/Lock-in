import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjhCmzL2EdijsLzaAy2vhMzsxO40_eR2I",
  authDomain: "my-app-1510c.firebaseapp.com",
  projectId: "my-app-1510c",
  storageBucket: "my-app-1510c.firebasestorage.app",
  messagingSenderId: "568372587517",
  appId: "1:568372587517:web:3253b97d0db39248f3c794",
  measurementId: "G-EMYW1LZVHT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

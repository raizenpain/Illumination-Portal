import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Your Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALNVRY5YJ-dAD7mNRm3s7YjUPfeWdQt2U",
  authDomain: "hcdc-puzzle-portal.firebaseapp.com",
  projectId: "hcdc-puzzle-portal",
  storageBucket: "hcdc-puzzle-portal.firebasestorage.app",
  messagingSenderId: "983684337171",
  appId: "1:983684337171:web:17cc57417dfd42311879e6",
  measurementId: "G-YQ155HLKT6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export {
  auth,
  provider,
  signInWithPopup,
  signOut,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
};

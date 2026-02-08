import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxdPoThxb48mbj5Jzs_Y7p8OVVp4ZIuxc",
  authDomain: "invoice-generator-9ab18.firebaseapp.com",
  projectId: "invoice-generator-9ab18",
  storageBucket: "invoice-generator-9ab18.firebasestorage.app",
  messagingSenderId: "413118585448",
  appId: "1:413118585448:web:6cc9c485b84b97b9b9b9dd",
  measurementId: "G-X5QZEP5F6Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc };

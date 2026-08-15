// firebase.js - Karni Pro - الإعداد الرسمي الموحد - v10.12.2
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLIzcO9i8QQ-YzYY5fIap6QNDsJDqgf60",
  authDomain: "karnipromaroc.firebaseapp.com",
  databaseURL: "https://karnipromaroc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karnipromaroc",
  storageBucket: "karnipromaroc.firebasestorage.app",
  messagingSenderId: "6746147726",
  appId: "1:6746147726:web:6e3a2d29941ab93ef432df",
  measurementId: "G-3Q1L0LC9TE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;

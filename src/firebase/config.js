import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js'
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js'
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js'

const firebaseConfig = {
  apiKey: "AIzaSyCyvYMhxJWXZdCB60MBrZFKeONnR4fXDcc",
  authDomain: "dk-social.firebaseapp.com",
  databaseURL: "https://dk-social-default-rtdb.firebaseio.com",
  projectId: "dk-social",
  storageBucket: "dk-social.appspot.com",
  messagingSenderId: "932389139148",
  appId: "1:932389139148:web:f7fc25c78a52114c1ec869"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar serviços
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { onAuthStateChanged }
export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp,
  onSnapshot
}

export default app


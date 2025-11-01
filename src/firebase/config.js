import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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

export default app


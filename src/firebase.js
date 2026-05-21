import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBy2-vKG76ETS7wzUmMMDJygVvqzmdnI5A",
  authDomain: "nikke-union-raid-mock.firebaseapp.com",
  projectId: "nikke-union-raid-mock",
  storageBucket: "nikke-union-raid-mock.firebasestorage.app",
  messagingSenderId: "734167917351",
  appId: "1:734167917351:web:5d96e2fa8dbad945eb3f02",
  measurementId: "G-SRFQT2KL0P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

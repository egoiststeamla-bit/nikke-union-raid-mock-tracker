import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmf1edyqT2Vbl9baIo9r9sruxilpEWfmw",
  authDomain: "nikke-union-raid-mock-dev.firebaseapp.com",
  projectId: "nikke-union-raid-mock-dev",
  storageBucket: "nikke-union-raid-mock-dev.firebasestorage.app",
  messagingSenderId: "528562170200",
  appId: "1:528562170200:web:9aaf7db8731cb988c39d2d"
};

const app = initializeApp(firebaseConfig, 'dev');
export const db = getFirestore(app);

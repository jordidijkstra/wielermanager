import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Vervang deze waarden met je eigen Firebase config
// Ga naar Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyABnGquRagO6-j1T7FaXiSqnOwX2qT7gMg",
  authDomain: "wielermanager-6a4c3.firebaseapp.com",
  projectId: "wielermanager-6a4c3",
  storageBucket: "wielermanager-6a4c3.firebasestorage.app",
  messagingSenderId: "678066753848",
  appId: "1:678066753848:web:7b86285be85af9b70d31cd",
  measurementId: "G-WQWTFMDEV3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6IABoU1T6lLuTH4Mf9TzgwQLqat5tWd4",
  authDomain: "online-food-delivery-3cb50.firebaseapp.com",
  projectId: "online-food-delivery-3cb50",
  storageBucket: "online-food-delivery-3cb50.firebasestorage.app",
  messagingSenderId: "997240387080",
  appId: "1:997240387080:web:f0b23bd663a1105f8dc3bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth=getAuth(app)
export {app,auth}
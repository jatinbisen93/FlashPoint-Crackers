// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACxHZjv7sd0vV5eNeJNcq6hfkuPkTeuew",
    authDomain: "shop-36fb4.firebaseapp.com",
    databaseURL: "https://shop-36fb4-default-rtdb.firebaseio.com",
    projectId: "shop-36fb4",
    storageBucket: "shop-36fb4.firebasestorage.app",
    messagingSenderId: "501779946609",
    appId: "1:501779946609:web:39782dc30f705b37c4cfd0",
    measurementId: "G-6ZFR8B3L0Q"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
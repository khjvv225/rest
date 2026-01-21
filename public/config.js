// Firebase konfiguratsiyasi
const firebaseConfig = {
    apiKey: "AIzaSyD4XwR4KpK9V9L2Q6N7s8P9t0Uv1W2X3Y4Z",
    authDomain: "bukhara-rest.firebaseapp.com",
    databaseURL: "https://bukhara-rest-default-rtdb.firebaseio.com",
    projectId: "bukhara-rest",
    storageBucket: "bukhara-rest.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
window.auth = auth;
window.db = db;
window.firebase = firebase;

// Firebase konfiguratsiyasi
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCFDWpwT_oFQV4u4MEjsFDJUNlVx645nVs",
    authDomain: "bukhara-reest.firebaseapp.com",
    projectId: "bukhara-reest",
    storageBucket: "bukhara-reest.appspot.com",
    messagingSenderId: "51840287890",
    appId: "1:51840287890:web:952f5fbc4c9ce0627b124b",
    measurementId: "G-2V3CP2DTZJ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
window.auth = auth;
window.firebase = firebase;

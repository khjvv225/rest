// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD4XwR4KpK9V9L2Q6N7s8P9t0Uv1W2X3Y4Z",
    authDomain: "bukhara-rest.firebaseapp.com",
    databaseURL: "https://bukhara-rest-default-rtdb.firebaseio.com",
    projectId: "bukhara-rest",
    storageBucket: "bukhara-rest.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.database();

// Eslatma: Yuqoridagi konfiguratsiya namunadir
// Haqiqiy Firebase loyihangizdan olingan ma'lumotlarni qo'ying

// Test connection
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
    } else {
        console.log('No user is signed in.');
    }
});

// Test database connection
firebase.database().ref('.info/connected').on('value', function(snapshot) {
    if (snapshot.val() === true) {
        console.log('Firebase Database connected');
    } else {
        console.log('Firebase Database not connected');
    }
});

// Export for use in other files
window.auth = auth;
window.db = db;
window.firebase = firebase;
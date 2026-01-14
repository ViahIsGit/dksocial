// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCyvYMhxJWXZdCB60MBrZFKeONnR4fXDcc",
    authDomain: "dk-social.firebaseapp.com",
    databaseURL: "https://dk-social-default-rtdb.firebaseio.com",
    projectId: "dk-social",
    storageBucket: "dk-social.appspot.com",
    messagingSenderId: "932389139148",
    appId: "1:932389139148:web:f7fc25c78a52114c1ec869"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png' // Ensure you have a logo
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

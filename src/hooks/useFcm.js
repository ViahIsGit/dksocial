import { useEffect } from 'react'
import { messaging, getToken, db, doc, updateDoc, onMessage } from '../firebase/config'

export const useFcm = (user) => {
    useEffect(() => {
        if (!user) return

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission()
                if (permission === 'granted') {
                    const token = await getToken(messaging, {
                        vapidKey: 'BM5...PUT_YOUR_VAPID_KEY_HERE_IF_NEEDED' // Optional if using default credential
                    })
                    if (token) {
                        console.log('FCM Token:', token)
                        // Save token to user profile
                        const userRef = doc(db, 'users', user.uid)
                        await updateDoc(userRef, {
                            fcmToken: token
                        })
                    }
                }
            } catch (error) {
                console.error('Error getting FCM token:', error)
            }
        }

        requestPermission()

        // Listen for foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // You can show a toast or snackbar here
            // For now, we rely on the OS notification or just the in-app bell badge
        })

        return () => unsubscribe && unsubscribe()
    }, [user])
}

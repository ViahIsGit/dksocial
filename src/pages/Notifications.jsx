import { useState, useEffect } from 'react'
import {
    db,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from '../firebase/config'
import { getAuth } from 'firebase/auth'
import './Notifications.css'
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const auth = getAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const user = auth.currentUser
        if (!user) {
            setLoading(false)
            return
        }

        const notifRef = collection(db, 'notifications')
        const q = query(
            notifRef,
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
        )

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const items = []

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data()

                // Fetch sender info if available
                let senderData = { username: 'Usuário', avatarBase64: '' }
                if (data.senderId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', data.senderId))
                        if (userDoc.exists()) {
                            senderData = userDoc.data()
                        }
                    } catch (err) {
                        console.error('Error fetching sender detail', err)
                    }
                }

                items.push({
                    id: docSnapshot.id,
                    ...data,
                    senderName: senderData.username || senderData.fullName || 'Alguém',
                    senderAvatar: senderData.avatarBase64,
                    timestamp: data.createdAt?.toMillis() || Date.now()
                })
            }

            setNotifications(items)
            setLoading(false)
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        })

        return () => unsubscribe()
    }, [auth.currentUser])

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            try {
                const notifDoc = doc(db, 'notifications', notification.id)
                await updateDoc(notifDoc, { read: true })
            } catch (e) {
                console.error(e)
            }
        }

        // Navigate based on type
        if (notification.type === 'follow') {
            const handle = notification.senderHandle || notification.senderId // Fallback to ID if handle missing
            navigate(`/u/${handle}`)
        } else if (notification.type === 'like' || notification.type === 'comment') {
            if (notification.senderHandle) {
                navigate(`/u/${notification.senderHandle}`)
            }
        }
    }

    const formatTime = (timestamp) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    }

    const getIconForType = (type) => {
        switch (type) {
            case 'follow': return 'person_add';
            case 'like': return 'favorite';
            case 'comment': return 'chat_bubble';
            default: return 'notifications';
        }
    }

    if (loading) {
        return (
            <div className="notifications-page loading">
                <mdui-circular-progress></mdui-circular-progress>
            </div>
        )
    }

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h2>Notificações</h2>
            </div>

            <mdui-list>
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <md-icon style={{ fontSize: '48px', marginBottom: '16px' }}>notifications_off</md-icon>
                        <p>Nenhuma notificação ainda</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <mdui-list-item
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            style={{
                                backgroundColor: notif.read ? 'transparent' : 'var(--mdui-color-secondary-container)',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                margin: '4px 8px'
                            }}
                        >
                            <div slot="headline">
                                <strong>{notif.senderName}</strong>
                                {notif.type === 'follow' && ' começou a seguir você.'}
                                {notif.type === 'like' && ' curtiu seu vídeo.'}
                                {notif.type === 'comment' && ` comentou: "${notif.commentText}"`}
                            </div>
                            <div slot="description">{formatTime(notif.timestamp)}</div>

                            <div slot="start" className="notification-avatar-container">
                                {notif.senderAvatar ? (
                                    <mdui-avatar src={notif.senderAvatar}></mdui-avatar>    
                                ) : (
                                    <mdui-avatar icon="person"></mdui-avatar>
                                )}
                                <div className="notification-type-badge">
                                    <md-icon style={{ fontSize: '12px', color: 'var(--mdui-color-on-primary-container)' }}>{getIconForType(notif.type)}</md-icon>
                                </div>
                            </div>

                            {(notif.type === 'like' || notif.type === 'comment') && notif.postThumbnail && (
                                <div slot="end" className="notification-thumbnail">
                                    <img src={notif.postThumbnail} alt="post" />
                                </div>
                            )}
                        </mdui-list-item>
                    ))
                )}
            </mdui-list>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { db, collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from '../firebase/config'
import { getAuth } from 'firebase/auth'
import './DashFeed.css'
import { useNavigate } from 'react-router-dom'

import CommentsModal from './CommentsModal'
import Avatar from './Avatar'

export default function DashFeed({ feedVersion }) {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [newPostText, setNewPostText] = useState('')
    const [selectedPostId, setSelectedPostId] = useState(null)
    const [isCommentsOpen, setIsCommentsOpen] = useState(false)
    const auth = getAuth()
    const currentUser = auth.currentUser
    const navigate = useNavigate()

    useEffect(() => {
        loadPosts()
    }, [feedVersion])

    const loadPosts = async () => {
        try {
            setLoading(true)
            const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50))
            const snap = await getDocs(q)

            const items = await Promise.all(snap.docs.map(async (d) => {
                const data = d.data()
                let user = { username: 'Unknown', avatar: '' }
                if (data.userId) {
                    const uSnap = await getDoc(doc(db, 'users', data.userId))
                    if (uSnap.exists()) user = uSnap.data()
                }
                return { id: d.id, ...data, user }
            }))
            setPosts(items)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePost = async () => {
        if (!newPostText.trim() || !currentUser) return

        try {
            await addDoc(collection(db, 'posts'), {
                text: newPostText,
                userId: currentUser.uid,
                createdAt: serverTimestamp(),
                likes: [],
                comments: 0
            })
            setNewPostText('')
            loadPosts() // simplest refresh
        } catch (e) {
            console.error(e)
        }
    }



    const handleComment = (e, post) => {
        e.stopPropagation()
        setSelectedPostId(post.id)
        setIsCommentsOpen(true)
    }

    const handleRepost = (e, post) => {
        e.stopPropagation()
        // Placeholder for repost logic
        alert('Repost functionality coming soon!')
    }

    const handleShare = (e, post) => {
        e.stopPropagation()
        if (navigator.share) {
            navigator.share({
                title: `Post de ${post.user.username}`,
                text: post.text,
                url: `${window.location.origin}/post/${post.id}`
            })
        }
    }

    const handleLike = async (e, post) => {
        e.stopPropagation()
        if (!currentUser) return

        const ref = doc(db, 'posts', post.id)
        const currentLikes = Array.isArray(post.likes) ? post.likes : []
        const isLiked = currentLikes.includes(currentUser.uid)

        if (isLiked) {
            await updateDoc(ref, { likes: arrayRemove(currentUser.uid) })
        } else {
            await updateDoc(ref, { likes: arrayUnion(currentUser.uid) })
            // Send notification if not own post
            if (post.userId !== currentUser.uid) {
                addDoc(collection(db, 'notifications'), {
                    recipientId: post.userId,
                    senderId: currentUser.uid,
                    type: 'like',
                    postId: post.id,
                    createdAt: serverTimestamp(),
                    read: false
                })
            }
        }
        loadPosts() // Refresh UI (optimistic update would be better but this is safer)
    }

    return (
        <div className="dash-feed">
            {loading ? (
                <div className="dash-loading">
                    <span className="material-symbols-outlined spin">progress_activity</span>
                </div>
            ) : (
                <div className="dash-list">
                    {posts.map(post => (
                        <div key={post.id} className="dash-post-card" onClick={() => navigate(`/post/${post.id}`)}>
                            <div className="post-header">
                                <div className="post-author-info" onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/u/${post.user.userHandle || post.userId}`)
                                }}>
                                    <Avatar src={post.user.avatarBase64} size={48} className="post-avatar" />
                                    <div className="post-author-text">
                                        <div className="post-name-row">
                                            <span className="post-name">{post.user.username}</span>
                                            <span className="post-handle">@{post.user.userHandle}</span>
                                            <span className="post-dot">·</span>
                                            <span className="post-time">
                                                {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="action-btn-small" style={{ margin: 0 }} onClick={(e) => e.stopPropagation()}>
                                    <span className="material-symbols-outlined">more_horiz</span>
                                </button>
                            </div>

                            <div className="post-body">
                                {post.text}
                            </div>

                            <div className="post-footer">
                                <button className="action-btn-small" onClick={(e) => handleComment(e, post)}>
                                    <span className="material-symbols-outlined">chat_bubble</span>
                                    <span className="action-value">{post.comments || 0}</span>
                                </button>

                                <button className="action-btn-small" onClick={(e) => handleRepost(e, post)}>
                                    <span className="material-symbols-outlined">repeat</span>
                                    <span className="action-value">0</span>
                                </button>

                                <button className={`action-btn-small ${Array.isArray(post.likes) && post.likes.includes(currentUser?.uid) ? 'liked' : ''}`} onClick={(e) => handleLike(e, post)}>
                                    <span className="material-symbols-outlined">favorite</span>
                                    <span className="action-value">{Array.isArray(post.likes) ? post.likes.length : 0}</span>
                                </button>

                                <button className="action-btn-small" onClick={(e) => handleShare(e, post)}>
                                    <span className="material-symbols-outlined">ios_share</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={selectedPostId}
                currentUser={currentUser}
                collectionName="posts"
            />
        </div>
    )
}

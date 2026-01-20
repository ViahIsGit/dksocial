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
        loadPosts()
    }

    const handleVote = async (e, post, optionId) => {
        e.stopPropagation()
        if (!currentUser) return

        const alreadyVoted = post.pollOptions.some(opt => opt.votes.includes(currentUser.uid))
        if (alreadyVoted) return;

        const updatedOptions = post.pollOptions.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, votes: [...opt.votes, currentUser.uid] }
            }
            return opt
        })

        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pollOptions: updatedOptions } : p))

        const ref = doc(db, 'posts', post.id)
        await updateDoc(ref, { pollOptions: updatedOptions })
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
                                            {post.location && (
                                                <span className="post-location-chip">
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                                                    {post.location.name}
                                                </span>
                                            )}
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

                            {post.mediaUrl && (
                                <div className="post-media-container" style={{ borderRadius: 16, overflow: 'hidden', marginTop: 12, marginBottom: 12, border: '1px solid var(--md-sys-color-outline-variant)' }}>
                                    {post.mediaType === 'video' ? (
                                        <video src={post.mediaUrl} controls style={{ width: '100%', display: 'block' }} />
                                    ) : (
                                        <img src={post.mediaUrl} alt="post media" style={{ width: '100%', display: 'block' }} />
                                    )}
                                </div>
                            )}

                            {post.type === 'poll' && (
                                <div className="poll-display" style={{ marginTop: 12, marginBottom: 12 }}>
                                    {post.pollOptions.map(opt => {
                                        const totalVotes = post.pollOptions.reduce((acc, curr) => acc + curr.votes.length, 0)
                                        const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
                                        const hasVoted = post.pollOptions.some(o => o.votes.includes(currentUser?.uid))
                                        const isSelected = opt.votes.includes(currentUser?.uid)

                                        return (
                                            <div
                                                key={opt.id}
                                                className={`poll-option ${hasVoted ? 'voted' : ''} ${isSelected ? 'selected' : ''}`}
                                                onClick={(e) => !hasVoted && handleVote(e, post, opt.id)}
                                                style={{
                                                    position: 'relative',
                                                    padding: '10px 14px',
                                                    marginBottom: 8,
                                                    borderRadius: 12,
                                                    background: 'var(--md-sys-color-surface-variant)',
                                                    cursor: hasVoted ? 'default' : 'pointer',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    className="poll-progress"
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0, top: 0, bottom: 0,
                                                        width: `${percentage}%`,
                                                        background: 'rgba(var(--md-sys-color-primary-rgb), 0.15)',
                                                        zIndex: 0
                                                    }}
                                                />
                                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                                                    <span>{opt.text}</span>
                                                    <span>{percentage}%</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div style={{ fontSize: 12, color: 'var(--md-sys-color-outline)' }}>
                                        {post.pollOptions.reduce((acc, curr) => acc + curr.votes.length, 0)} votes
                                    </div>
                                </div>
                            )}

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

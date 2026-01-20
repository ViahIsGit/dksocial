import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CommentsModal from '../components/CommentsModal'
import { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from '../firebase/config'
import { getAuth } from 'firebase/auth'
import './PostDetails.css'
import '@material/web/icon/icon.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/progress/circular-progress.js'
import '@material/web/button/filled-button.js'

import Avatar from '../components/Avatar' // Using existing Avatar component if available, else standardimg

export default function PostDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const auth = getAuth()
    const currentUser = auth.currentUser

    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isCommentsOpen, setIsCommentsOpen] = useState(false)

    useEffect(() => {
        const loadPost = async () => {
            if (!id) return
            try {
                const docRef = doc(db, 'posts', id)
                const snap = await getDoc(docRef)
                if (snap.exists()) {
                    const data = snap.data()
                    let user = { username: 'Unknown', avatar: '' }
                    if (data.userId) {
                        const uSnap = await getDoc(doc(db, 'users', data.userId))
                        if (uSnap.exists()) user = uSnap.data()
                    }
                    setPost({ id: snap.id, ...data, user })
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        loadPost()
    }, [id])

    const handleLike = async () => {
        if (!currentUser || !post) return

        const ref = doc(db, 'posts', post.id)
        const currentLikes = Array.isArray(post.likes) ? post.likes : []
        const isLiked = currentLikes.includes(currentUser.uid)

        // Optimistic UI
        const newLikes = isLiked
            ? currentLikes.filter(uid => uid !== currentUser.uid)
            : [...currentLikes, currentUser.uid]

        setPost(p => ({ ...p, likes: newLikes }))

        if (isLiked) {
            await updateDoc(ref, { likes: arrayRemove(currentUser.uid) })
        } else {
            await updateDoc(ref, { likes: arrayUnion(currentUser.uid) })
        }
    }

    const handleRepost = () => {
        alert('Repost functionality coming soon!')
    }

    if (loading) {
        return (
            <div className="post-details-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <md-circular-progress indeterminate></md-circular-progress>
            </div>
        )
    }

    if (!post) {
        return (
            <div className="post-details-container">
                <header className="post-details-header">
                    <md-icon-button onClick={() => navigate(-1)}>
                        <md-icon>arrow_back</md-icon>
                    </md-icon-button>
                    <h3>Post not found</h3>
                </header>
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <md-icon style={{ fontSize: 48, opacity: 0.5 }}>error_outline</md-icon>
                    <p>This post may have been deleted.</p>
                </div>
            </div>
        )
    }

    const isLiked = Array.isArray(post.likes) && post.likes.includes(currentUser?.uid)

    return (
        <div className="post-details-container">
            <header className="post-details-header">
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
                <span style={{ fontWeight: 600, fontSize: '1.2rem' }}>Post</span>
            </header>

            <div className="post-details-content">
                <main className="post-details-main">
                    <div
                        className="post-details-user"
                        onClick={() => navigate(`/u/${post.user.userHandle || post.userId}`)}
                    >
                        {/* Fallback avatar logic inline if specific component not robust */}
                        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'var(--md-sys-color-surface-variant)' }}>
                            {post.user.avatarBase64 ? (
                                <img src={post.user.avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <md-icon>person</md-icon>
                                </div>
                            )}
                        </div>

                        <div className="post-details-names">
                            <span className="post-details-name">{post.user.username}</span>
                            <span className="post-details-handle">@{post.user.userHandle}</span>
                        </div>
                    </div>

                    <div className="post-details-text">
                        {post.text}
                    </div>

                    {post.mediaUrl && (
                        <div className="post-details-media" style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 24, border: '1px solid var(--md-sys-color-outline-variant)' }}>
                            {post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} controls style={{ width: '100%', display: 'block', maxHeight: '500px' }} />
                            ) : (
                                <img src={post.mediaUrl} alt="post media" style={{ width: '100%', display: 'block' }} />
                            )}
                        </div>
                    )}

                    {post.type === 'poll' && (
                        <div className="poll-display" style={{ marginTop: 12, marginBottom: 24, width: '100%' }}>
                            {post.pollOptions.map(opt => {
                                const totalVotes = post.pollOptions.reduce((acc, curr) => acc + curr.votes.length, 0)
                                const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
                                const hasVoted = post.pollOptions.some(o => o.votes.includes(currentUser?.uid))
                                const isSelected = opt.votes.includes(currentUser?.uid)

                                return (
                                    <div
                                        key={opt.id}
                                        className={`poll-option ${hasVoted ? 'voted' : ''} ${isSelected ? 'selected' : ''}`}
                                        onClick={async () => {
                                            if (hasVoted || !currentUser) return
                                            const updatedOptions = post.pollOptions.map(o => o.id === opt.id ? { ...o, votes: [...o.votes, currentUser.uid] } : o)
                                            setPost(prev => ({ ...prev, pollOptions: updatedOptions }))
                                            const ref = doc(db, 'posts', post.id)
                                            await updateDoc(ref, { pollOptions: updatedOptions })
                                        }}
                                        style={{
                                            position: 'relative',
                                            padding: '12px 16px',
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

                    <div className="post-details-meta">
                        {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString(undefined, {
                            hour: 'numeric', minute: 'numeric',
                            day: 'numeric', month: 'short', year: 'numeric'
                        }) : ''}
                        {post.location && (
                            <span style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--md-sys-color-primary)', background: 'rgba(var(--md-sys-color-primary-rgb), 0.08)', padding: '2px 8px', borderRadius: 6, fontSize: '0.9rem' }}>
                                <md-icon style={{ fontSize: 16 }}>location_on</md-icon>
                                {post.location.name}
                            </span>
                        )}
                    </div>

                    <div className="post-details-stats">
                        <span className="post-stat">
                            <strong>{Array.isArray(post.likes) ? post.likes.length : 0}</strong> Likes
                        </span>
                        <span className="post-stat">
                            <strong>{post.comments || 0}</strong> Comments
                        </span>
                    </div>

                    <div className="post-details-actions">
                        <button className="action-btn" onClick={() => setIsCommentsOpen(true)}>
                            <md-icon>chat_bubble_outline</md-icon>
                        </button>

                        <button className="action-btn" onClick={handleRepost}>
                            <md-icon>repeat</md-icon>
                        </button>

                        <button
                            className={`action-btn ${isLiked ? 'liked' : ''}`}
                            onClick={handleLike}
                        >
                            <md-icon>{isLiked ? "favorite" : "favorite_border"}</md-icon>
                        </button>

                        <button className="action-btn" onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Post by ${post.user.username}`,
                                    text: post.text,
                                    url: window.location.href
                                })
                            }
                        }}>
                            <md-icon>ios_share</md-icon>
                        </button>
                    </div>
                </main>

                <div className="post-comments-section">
                    {/* Using md-filled-button as a clear call to action */}
                    <md-filled-button style={{ width: '100%' }} onClick={() => setIsCommentsOpen(true)}>
                        View Comments
                    </md-filled-button>
                </div>
            </div>

            <CommentsModal
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                postId={post.id}
                currentUser={currentUser}
                collectionName="posts"
            />
        </div>
    )
}

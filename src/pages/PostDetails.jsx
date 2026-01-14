import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CommentsModal from '../components/CommentsModal'
import { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from '../firebase/config'
import { getAuth } from 'firebase/auth'
import './PostDetails.css'
import 'mdui/components/top-app-bar.js';
import 'mdui/components/top-app-bar-title.js';
import 'mdui/components/button-icon.js';
import 'mdui/components/button.js';
import 'mdui/components/icon.js';
import 'mdui/components/circular-progress.js';

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
            <div className="post-details-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <mdui-circular-progress></mdui-circular-progress>
            </div>
        )
    }

    if (!post) {
        return (
            <div className="post-details-container">
                <mdui-top-app-bar variant="small" scroll-target=".example-variant" class="example-variant-bar">
                    <md-icon onClick={() => navigate(-1)}>arrow_back</md-icon>
                    <mdui-top-app-bar-title>Detalhes do Post</mdui-top-app-bar-title>
                    <div style={{ flexGrow: 1 }}></div>
                </mdui-top-app-bar>
                <div style={{ marginTop: 80, padding: 20, textAlign: 'center' }}>Post não encontrado</div>
            </div>
        )
    }

    const isLiked = Array.isArray(post.likes) && post.likes.includes(currentUser?.uid)

    return (
        <div className="post-details-container">
            <mdui-top-app-bar variant="small" scroll-target=".example-variant" class="example-variant-bar">
                <md-icon onClick={() => navigate(-1)}>arrow_back</md-icon>
                <mdui-top-app-bar-title>Detalhes do Post</mdui-top-app-bar-title>
                <div style={{ flexGrow: 1 }}></div>
            </mdui-top-app-bar>

            <div className="post-details-content">
                <main className="post-details-main">
                    <div
                        className="post-details-user"
                        onClick={() => navigate(`/u/${post.user.userHandle || post.userId}`)}
                    >
                        {post.user.avatarBase64 ? (
                            <mdui-avatar src={post.user.avatarBase64} alt={post.user.username}></mdui-avatar>
                        ) : (
                            <mdui-avatar icon="person"></mdui-avatar>
                        )}
                        <div className="post-details-names">
                            <span className="post-details-name">{post.user.username}</span>
                            <span className="post-details-handle">@{post.user.userHandle}</span>
                        </div>
                    </div>

                    <div className="post-details-text">
                        {post.text}
                    </div>

                    <div className="post-details-meta">
                        {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : ''}
                    </div>

                    <div className="post-details-stats">
                        <span className="post-stat"><strong>{Array.isArray(post.likes) ? post.likes.length : 0}</strong><md-icon>favorite</md-icon></span>
                        <span className="post-stat"><strong>{post.comments || 0}</strong><md-icon>chat_bubble_outline</md-icon></span>
                    </div>

                    <div className="post-details-actions">
                        <div className="comment-count-group">
                            <md-icon onClick={() => setIsCommentsOpen(true)}>chat_bubble_outline</md-icon>
                            <span>{post.comments || 0}</span>
                        </div>

                        <md-icon onClick={handleRepost}>repeat</md-icon>

                        <md-icon
                            style={{ color: isLiked ? 'var(--mdui-color-error)' : 'inherit' }}
                            onClick={handleLike}
                        >{isLiked ? "favorite" : "favorite_border"}</md-icon>

                        <md-icon onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Post de ${post.user.username}`,
                                    text: post.text,
                                    url: window.location.href
                                })
                            }
                        }}>ios_share</md-icon>
                    </div>
                </main>

                <div className="post-comments-section">
                    <mdui-button full-width onClick={() => setIsCommentsOpen(true)}>Ver comentários</mdui-button>
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

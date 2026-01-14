import { useState } from 'react'
import { db, collection, addDoc, serverTimestamp } from '../firebase/config'
import './CreatePostModal.css'

export default function CreatePostModal({ isOpen, onClose, currentUser }) {
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handlePost = async () => {
        if (!text.trim() || !currentUser) return
        setLoading(true)
        try {
            await addDoc(collection(db, 'posts'), {
                text: text,
                userId: currentUser.uid,
                createdAt: serverTimestamp(),
                likes: [],
                comments: 0
            })
            setText('')
            if (onClose) onClose()
            if (onPostCreated) onPostCreated()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-post-modal-overlay">
            <div className="create-post-modal">
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <button
                        className="post-action-btn"
                        onClick={handlePost}
                        disabled={!text.trim() || loading}
                    >
                        {loading ? 'Postando...' : 'Postar'}
                    </button>
                </div>

                <div className="modal-body">
                    <div className="user-avatar-area">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} className="modal-avatar" alt="avatar" />
                        ) : (
                            <span className="material-symbols-outlined modal-avatar-placeholder">account_circle</span>
                        )}
                    </div>
                    <textarea
                        className="post-textarea"
                        placeholder="O que está acontecendo?"
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}

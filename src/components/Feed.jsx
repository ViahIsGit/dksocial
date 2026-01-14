import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { fetchReels, fetchFollowingReels, incrementViews, getUserProfile } from '../services/reels'
import { useLayout } from '../context/LayoutContext'
import VideoCard from './VideoCard'

import GlobalSearch from './GlobalSearch'
import DashFeed from './DashFeed'
import CreatePostModal from './CreatePostModal'
import Avatar from './Avatar'
import './Feed.css'

export default function Feed({ initialTab }) {
    const navigate = useNavigate()
    const { setBottomNavHidden } = useLayout()
    const [activeTab, setActiveTab] = useState(initialTab || 'foryou') // 'foryou' | 'following' | 'dash'
    const [isPostModalOpen, setIsPostModalOpen] = useState(false)
    const [feedVersion, setFeedVersion] = useState(0)

    // ... videos state

    const handleTabSwitch = (tab) => {
        if (tab === 'dash') {
            navigate('/dash')
        } else {
            if (initialTab === 'dash') navigate('/feed')
            setActiveTab(tab)
        }
    }
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [activeVideoId, setActiveVideoId] = useState(null)
    const [currentUser, setCurrentUser] = useState(auth.currentUser)

    // Sheet state
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
    const [savedAccounts, setSavedAccounts] = useState([]) // carregará contas salvas/local

    // Cache for user profiles to avoid repeated fetches
    const userCache = useRef({})

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user)
        })
        return () => unsubscribe()
    }, [])

    // Carregar contas "salvas" do localStorage (opcional)
    // Load and update saved accounts
    useEffect(() => {
        const updateSavedAccounts = () => {
            try {
                const raw = window.localStorage.getItem('savedAccounts')
                let accounts = raw ? JSON.parse(raw) : []

                if (auth.currentUser) {
                    const current = {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        username: auth.currentUser.displayName || 'Usuário',
                        avatar: auth.currentUser.photoURL || ''
                    }

                    // Remove existing entry for this user to update it
                    accounts = accounts.filter(acc => acc.uid !== current.uid && acc.email !== current.email)
                    // Add updated current user to top
                    accounts.unshift(current)

                    // Limit to last 5 accounts
                    accounts = accounts.slice(0, 5)

                    window.localStorage.setItem('savedAccounts', JSON.stringify(accounts))
                }
                setSavedAccounts(accounts)
            } catch (e) {
                console.error("Error managing saved accounts", e)
                setSavedAccounts([])
            }
        }

        updateSavedAccounts()
    }, [currentUser])

    // Helper to format videos
    const formatVideos = useCallback(async (reels) => {
        // Helper to get user info with cache
        const getUserInfo = async (userId) => {
            if (userCache.current[userId]) return userCache.current[userId]
            try {
                const profile = await getUserProfile(userId)
                const info = {
                    username: profile?.username || 'Usuário',
                    avatar: profile?.profilePicture || '/feed/logo.png'
                }
                userCache.current[userId] = info
                return info
            } catch (e) {
                return { username: 'Usuário', avatar: '/feed/logo.png' }
            }
        }

        const formatted = await Promise.all(reels.map(async (reel) => {
            const userInfo = await getUserInfo(reel.userId)
            return {
                id: reel.id,
                ...reel,
                username: userInfo.username,
                avatar: userInfo.avatar,
                thumbnail: reel.thumbnailUrl || reel.videoUrl,
                videoUrl: reel.videoUrl,
                description: reel.desc || '',
                likes: reel.likesUsers?.length || 0,
                comments: reel.comments || 0,
                shares: 0,
                isLiked: currentUser ? reel.likesUsers?.includes(currentUser.uid) : false,
                isFavorited: currentUser ? reel.favoritesUsers?.includes(currentUser.uid) : false,
                reelId: reel.id
            }
        }))
        return formatted
    }, [currentUser])

    // Fetch videos
    const loadVideos = useCallback(async () => {
        setLoading(true)
        try {
            let rawReels = []
            if (activeTab === 'following' && currentUser) {
                rawReels = await fetchFollowingReels(currentUser.uid)
            } else {
                rawReels = await fetchReels()
                // Shuffle for "For You"
                rawReels = rawReels.sort(() => Math.random() - 0.5)
            }

            const formatted = await formatVideos(rawReels)
            setVideos(formatted)

            // Set first video active if available
            if (formatted.length > 0) {
                setActiveVideoId(String(formatted[0].id))
            }
        } catch (error) {
            console.error("Error loading feed:", error)
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentUser, formatVideos])

    useEffect(() => {
        loadVideos()
    }, [loadVideos])

    // Intersection Observer for active video
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const videoId = entry.target.dataset.id
                        if (videoId) {
                            setActiveVideoId(videoId)
                            // Increment views
                            incrementViews(videoId).catch(console.error)
                        }
                    }
                })
            },
            { threshold: 0.7 }
        )

        const elements = document.querySelectorAll('.feed-video-item')
        elements.forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [videos])

    const handlePlayRequest = (videoId) => {
        setActiveVideoId(videoId)
    }

    /* =========================
       Account switching UI
       ========================= */
    const openAccountSheet = () => {
        setBottomNavHidden(true)
        setIsAccountSheetOpen(true)
    }
    const closeAccountSheet = () => {
        setBottomNavHidden(false)
        setIsAccountSheetOpen(false)
    }

    const switchToAccount = async (account) => {
        // If it's the current user, just close sheet
        if (currentUser && (account.uid === currentUser.uid || account.email === currentUser.email)) {
            closeAccountSheet()
            return
        }

        try {
            await auth.signOut()
            window.localStorage.removeItem('logged') // Clear simple local flag
            navigate('/login', { state: { email: account.email } })
            closeAccountSheet()
        } catch (error) {
            console.error("Error signing out to switch:", error)
        }
    }

    const handleAddAccount = () => {
        // redireciona para fluxo de adicionar conta/login
        navigate('/login')
        closeAccountSheet()
    }



    return (
        <div className="feed-container">
            {/* FLOATING ACTION BUTTON */}
            {activeTab === 'dash' ? (
                <button
                    className="floating-avatar" // Using same class for positioning but different style if needed, or add modifier
                    style={{ borderRadius: '16px', backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}
                    onClick={() => setIsPostModalOpen(true)}
                    title="Novo Post"
                >
                    <span className="material-symbols-outlined">edit</span>
                </button>
            ) : (
                <button
                    className="floating-avatar-btn"
                    onClick={openAccountSheet}
                    title="Trocar conta"
                >
                    {currentUser?.photoURL ? (
                        <Avatar src={currentUser.photoURL} size={48} className="floating-avatar-img" />
                    ) : (
                        <div className="floating-avatar-placeholder">
                            <span className="material-symbols-outlined">account_circle</span>
                        </div>
                    )}
                </button>
            )}

            <div className="feed-header">
                <div className="feed-tabs-container">
                    <button
                        className={`feed-tab ${activeTab === 'dash' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('dash')}
                    >
                        Dash
                    </button>
                    <div className="tab-divider"></div>
                    <button
                        className={`feed-tab ${activeTab === 'following' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('following')}
                    >
                        Seguindo
                    </button>
                    <div className="tab-divider"></div>
                    <button
                        className={`feed-tab ${activeTab === 'foryou' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('foryou')}
                    >
                        Para você
                    </button>
                </div>
                <button className="feed-search-btn" onClick={() => setIsSearchOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                </button>
            </div>

            {activeTab === 'dash' ? (
                <DashFeed feedVersion={feedVersion} />
            ) : (
                <div className="feed-scroll-container">
                    {videos.map((video, index) => (
                        <div key={video.id} className="feed-video-item" data-id={video.id}>
                            <VideoCard
                                video={video}
                                currentUser={currentUser}
                                isActive={activeVideoId === String(video.id)}
                                isFirst={index === 0}
                                onPlayRequest={handlePlayRequest}
                            />
                        </div>
                    ))}

                    {loading && <div className="feed-loader">Carregando...</div>}

                    {!loading && videos.length === 0 && (
                        <div className="feed-empty-state">
                            <span className="material-symbols-outlined">videocam_off</span>
                            <p>Nenhum vídeo encontrado</p>
                        </div>
                    )}
                </div>
            )}
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />

            <CreatePostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                currentUser={currentUser}
                onPostCreated={() => setFeedVersion(v => v + 1)}
            />

            {/* Account switch sheet */}
            {isAccountSheetOpen && (
                <div className="account-sheet-overlay" onClick={closeAccountSheet}>
                    <div className="account-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="account-sheet-header">
                            <h3>Contas</h3>
                            <button className="close-btn" onClick={closeAccountSheet}>Fechar</button>
                        </div>

                        <div className="account-list">
                            {savedAccounts.length === 0 && (
                                <div className="no-accounts">
                                    <p>Nenhuma conta salva.</p>
                                </div>
                            )}
                            {savedAccounts.map((acc) => (
                                <div key={acc.uid || acc.email} className="account-item">
                                    <div className="account-item-left">
                                        {acc.avatar ? (
                                            <Avatar src={acc.avatar} size={40} className="account-avatar-img" />
                                        ) : (
                                            <div className="account-avatar-placeholder">
                                                <span className="material-symbols-outlined">account_circle</span>
                                            </div>
                                        )}
                                        <div className="account-meta">
                                            <div className="account-name">{acc.username || acc.email}</div>
                                            <div className="account-email">{acc.email}</div>
                                        </div>
                                    </div>
                                    <div className="account-item-actions">
                                        <button className="switch-btn" onClick={() => switchToAccount(acc)}>Trocar</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="account-sheet-footer">
                            <button className="add-account-btn" onClick={handleAddAccount}>Adicionar conta</button>
                            <button className="manage-accounts-btn" onClick={() => { navigate('/settings/accounts'); closeAccountSheet() }}>Gerenciar contas</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}





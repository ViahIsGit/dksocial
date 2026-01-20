import { useEffect, useState } from 'react'
import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from '../firebase/config'
import { signOut } from 'firebase/auth'
import { useNavigate, useParams } from 'react-router-dom'
import { followUser, unfollowUser, isFollowing } from '../services/reels'
import { getOrCreateConversation } from '../services/messages'
import ProfileVideoViewer from './ProfileVideoViewer'
import VideoThumbnail from './VideoThumbnail'
import SettingsSheet from './SettingsSheet'
import './Profile.css'
import Avatar from './Avatar'

export default function Profile({ onMenuClick, drawerOpen }) {
  const { handle } = useParams()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerVideos, setViewerVideos] = useState([])
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)

  const [userPosts, setUserPosts] = useState([])
  const [favorites, setFavorites] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [followersList, setFollowersList] = useState([])
  const [activeTab, setActiveTab] = useState('posts')

  const [postsLoading, setPostsLoading] = useState(false)
  const [dashPosts, setDashPosts] = useState([])

  // ... (previous useEffects)

  // ... (previous useEffects)

  /* =========================
     Fetch Dash Posts
     ========================= */
  useEffect(() => {
    if (!profileData?.uid || activeTab !== 'dash') return

    const loadDashPosts = async () => {
      setPostsLoading(true)
      try {
        const q = query(
          collection(db, 'posts'),
          where('userId', '==', profileData.uid),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        setDashPosts(snap.docs.map(d => ({ id: d.id, ...d.data(), user: profileData })))
      } catch (e) {
        console.error(e)
      } finally {
        setPostsLoading(false)
      }
    }
    loadDashPosts()
  }, [profileData, activeTab])

  /* =========================
     Fetch Following/Followers Users
     ========================= */
  useEffect(() => {
    if (!profileData?.uid) return

    // Only fetch if tab is active
    if (activeTab === 'following') {
      const loadFollowing = async () => {
        const ref = collection(db, 'followers', profileData.uid, 'userFollowing')
        const snap = await getDocs(ref)
        const users = []
        for (const d of snap.docs) {
          const uSnap = await getDoc(doc(db, 'users', d.id))
          if (uSnap.exists()) users.push({ id: d.id, ...uSnap.data() })
        }
        setFollowingList(users)
      }
      loadFollowing()
    }

    if (activeTab === 'followers') {
      const loadFollowers = async () => {
        const ref = collection(db, 'followers', profileData.uid, 'userFollowers')
        const snap = await getDocs(ref)
        const users = []
        for (const d of snap.docs) {
          const uSnap = await getDoc(doc(db, 'users', d.id))
          if (uSnap.exists()) users.push({ id: d.id, ...uSnap.data() })
        }
        setFollowersList(users)
      }
      loadFollowers()
    }
  }, [profileData?.uid, activeTab])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const isOwnProfile =
    currentUser && profileData && currentUser.uid === profileData.uid

  /* =========================
     Auth (quem está logado)
     ========================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  /* =========================
     Carregar perfil pelo handle
     ========================= */
  useEffect(() => {
    if (!handle) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('userHandle', '==', handle))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          navigate('/404')
          return
        }

        const snap = snapshot.docs[0]
        setProfileData({
          uid: snap.id,
          ...snap.data()
        })
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [handle, navigate])

  /* =========================
     Estatísticas de follow
     ========================= */
  useEffect(() => {
    if (!currentUser || !profileData) return

    const loadStats = async () => {
      const followersRef = collection(
        db,
        'followers',
        profileData.uid,
        'userFollowers'
      )
      const followingRef = collection(
        db,
        'followers',
        profileData.uid,
        'userFollowing'
      )

      const followersSnap = await getDocs(followersRef)
      const followingSnap = await getDocs(followingRef)

      setFollowersCount(followersSnap.size)
      setFollowingCount(followingSnap.size)

      if (!isOwnProfile) {
        const following = await isFollowing(profileData.uid, currentUser.uid)
        setIsFollowingUser(following)

        if (following) {
          const mutual = await isFollowing(
            currentUser.uid,
            profileData.uid
          )
          setIsFriend(mutual)
        }
      }
    }

    loadStats()
  }, [currentUser, profileData, isOwnProfile])

  /* =========================
     Posts do usuário
     ========================= */
  /* =========================
     Posts do usuário (com verificação de Privacidade)
     ========================= */
  const [postsHidden, setPostsHidden] = useState(false);

  useEffect(() => {
    if (!profileData?.uid || activeTab !== 'posts') return

    // Privacy Check
    if (!isOwnProfile && profileData.isPrivate && !isFollowingUser) {
      setPostsHidden(true);
      setPostsLoading(false);
      return;
    }
    setPostsHidden(false);

    const loadPosts = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const q = query(
          reelsRef,
          where('userId', '==', profileData.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        setUserPosts(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().createdAt?.toMillis() || Date.now()
          }))
        )
      } catch (e) {
        console.error('Erro ao carregar posts:', e)
      } finally {
        setPostsLoading(false)
      }
    }

    loadPosts()
  }, [profileData, activeTab, isFollowingUser, isOwnProfile])


  /* =========================
     Favoritos (apenas próprio)
     ========================= */
  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'favorites') return

    const loadFavorites = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const snap = await getDocs(reelsRef)

        const favs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.favoritesUsers?.includes(currentUser.uid))

        setFavorites(favs)
      } finally {
        setPostsLoading(false)
      }
    }

    loadFavorites()
  }, [activeTab, isOwnProfile, currentUser])

  /* =========================
     Actions
     ========================= */
  const handleFollow = async () => {
    if (!currentUser || isOwnProfile) return

    if (isFollowingUser) {
      await unfollowUser(profileData.uid, currentUser.uid)
      setIsFollowingUser(false)
      setIsFriend(false)
      setFollowersCount(v => v - 1)
    } else {
      await followUser(profileData.uid, currentUser.uid)
      setIsFollowingUser(true)
      setFollowersCount(v => v + 1)

      const mutual = await isFollowing(
        currentUser.uid,
        profileData.uid
      )
      setIsFriend(mutual)
    }
  }

  const handleStartChat = async () => {
    if (!currentUser || isOwnProfile) return
    await getOrCreateConversation(currentUser.uid, profileData.uid)
    navigate('/messages')
  }

  const handleEditProfile = () => navigate('/u/edit')

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  /* =========================
     Viewer
     ========================= */
  const handleVideoClick = (video, all) => {
    setViewerVideos(all)
    setViewerInitialIndex(all.findIndex(v => v.id === video.id))
    setViewerOpen(true)
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <md-circular-progress indeterminate />
      </div>
    )
  }

  /* =========================
     Render
     ========================= */
  return (
    <>
      {viewerOpen && (
        <ProfileVideoViewer
          videos={viewerVideos}
          initialIndex={viewerInitialIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profileUrl={window.location.href}
        onLogout={handleLogout}
      />

      <div className="profile-page">
        {/* Cover / Header Background */}
        <div className="profile-cover">
          <div className="profile-cover-gradient"></div>
        </div>

        {/* Menu Button (Top Right) */}
        {isOwnProfile && (
          <button
            className="profile-menu-button"
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        )}

        <div className="profile-content-wrapper">
          <div className="profile-header-section">
            <div className="profile-avatar-container">
              {profileData.avatarBase64 ? (
                <Avatar
                  src={profileData.avatarBase64}
                  size={160} // Increased size as requested
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <span className="material-symbols-outlined">account_circle</span>
                </div>
              )}
            </div>

            <div className="profile-title-section">
              <h1 className="profile-name">{profileData.username}</h1>
              <div className="profile-handle">@{profileData.userHandle}</div>
              {/* Bio would go here if available in data */}
              {profileData.bio && (
                <p className="profile-bio-text">{profileData.bio}</p>
              )}

              {/* SOCIAL LINKS */}
              {profileData.socialLinks && (
                <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
                  {profileData.socialLinks.instagram && (
                    <a href={`https://instagram.com/${profileData.socialLinks.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
                      <i className="fa-brands fa-instagram" style={{ fontSize: 24, fontFamily: 'sans-serif', fontWeight: 'bold' }}>IG</i>
                    </a>
                  )}
                  {profileData.socialLinks.twitter && (
                    <a href={`https://twitter.com/${profileData.socialLinks.twitter}`} target="_blank" rel="noreferrer" style={{ color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>X</span>
                    </a>
                  )}
                  {profileData.socialLinks.facebook && (
                    <a href={`https://facebook.com/${profileData.socialLinks.facebook}`} target="_blank" rel="noreferrer" style={{ color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>FB</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="profile-actions">
              {isOwnProfile ? (
                <button className="m3-btn tonal" onClick={handleEditProfile}>
                  <span className="material-symbols-outlined">edit</span>
                  Editar perfil
                </button>
              ) : (
                <>
                  <button
                    className={`m3-btn ${isFollowingUser ? 'outlined' : 'filled'}`}
                    onClick={handleFollow}
                  >
                    {isFriend ? (
                      <>
                        <span className="material-symbols-outlined">check</span>
                        Amigos
                      </>
                    ) : isFollowingUser ? (
                      <>
                        <span className="material-symbols-outlined">check</span>
                        Seguindo
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">add</span>
                        Seguir
                      </>
                    )}
                  </button>
                  <button className="m3-btn tonal" onClick={handleStartChat}>
                    <span className="material-symbols-outlined">chat_bubble</span>
                    Mensagem
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item" onClick={() => {
              setActiveTab('followers')
              document.getElementById('view-followers')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              <span className="stat-number">{followersCount}</span>
              <span className="stat-label">Seguidores</span>
            </div>
            <div className="stat-item" onClick={() => {
              setActiveTab('following')
              document.getElementById('view-following')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              <span className="stat-number">{followingCount}</span>
              <span className="stat-label">Seguindo</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Curtidas</span>
            </div>
          </div>

          <div className="profile-tabs-container">
            <div className="profile-tabs">
              <button
                className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('posts')
                  document.getElementById('view-posts')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button
                className={`profile-tab ${activeTab === 'dash' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('dash')
                  document.getElementById('view-dash')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="material-symbols-outlined">article</span>
              </button>
              {isOwnProfile && (
                <button
                  className={`profile-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('favorites')
                    document.getElementById('view-favorites')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <span className="material-symbols-outlined">bookmark</span>
                </button>
              )}
              <button
                className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('following')
                  document.getElementById('view-following')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="material-symbols-outlined">group</span>
              </button>
              <button
                className={`profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('followers')
                  document.getElementById('view-followers')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="material-symbols-outlined">groups</span>
              </button>
            </div>
          </div>

          {/* SWIPEABLE CONTAINER */}
          <div
            className="profile-views-container"
            onScroll={(e) => {
              const el = e.target
              const scrollLeft = el.scrollLeft
              const width = el.offsetWidth
              // Simple debiting logic / snap detection
              const index = Math.round(scrollLeft / width)

              const tabs = isOwnProfile
                ? ['posts', 'dash', 'favorites', 'following', 'followers']
                : ['posts', 'dash', 'following', 'followers']

              const currentTab = tabs[index]
              if (currentTab && currentTab !== activeTab) {
                // Update tab pill without triggering scroll (loop prevention needs care)
                // Currently simple state set is fine as scrollIntoView is on click
                setActiveTab(currentTab)
              }
            }}
          >
            {/* VIEW: POSTS */}
            <div id="view-posts" className="profile-view-section">
              <div className="posts-grid">
                {postsLoading ? (
                  <div className="loading-posts">
                    <span className="material-symbols-outlined spin">progress_activity</span>
                  </div>
                ) : userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <div key={post.id} className="profile-post-card" onClick={() => handleVideoClick(post, userPosts)}>
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} loading="lazy" alt="" />
                      ) : (
                        <video src={post.videoUrl} preload="metadata" />
                      )}
                      <div className="profile-video-views">
                        <span className="material-symbols-outlined">play_arrow</span>
                        {post.views || 0}
                      </div>
                    </div>
                  ))
                ) : postsHidden ? (
                  <div className="empty-state">
                    <md-icon style={{ fontSize: 48, marginBottom: 16 }}>lock</md-icon>
                    <p>Esta conta é privada</p>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Siga para ver os posts</span>
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="material-symbols-outlined">videocam_off</span>
                    <p>Nenhum post ainda</p>
                  </div>
                )}
              </div>
            </div>

            {/* VIEW: DASH (Text Posts) */}
            <div id="view-dash" className="profile-view-section">
              <div className="dash-list-profile" style={{ padding: '0 8px' }}>
                {postsLoading ? (
                  <div className="loading-posts">
                    <span className="material-symbols-outlined spin">progress_activity</span>
                  </div>
                ) : dashPosts.length > 0 ? (
                  dashPosts.map(post => (
                    <div key={post.id} className="dash-post-card" style={{ marginBottom: 12, border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 16, padding: 16, background: 'var(--md-sys-color-surface)' }}>
                      <p style={{ fontSize: 16, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{post.text}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7, fontSize: 12 }}>
                        <span>{post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString() : 'Agora'}</span>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>favorite</span> {post.likes?.length || 0}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat_bubble</span> {post.comments || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="material-symbols-outlined">article</span>
                    <p>Nenhum post no dash.</p>
                  </div>
                )}
              </div>
            </div>

            {/* VIEW: FAVORITES (Own only) */}
            {isOwnProfile && (
              <div id="view-favorites" className="profile-view-section">
                <div className="posts-grid">
                  {postsLoading ? (
                    <div className="loading-posts">
                      <span className="material-symbols-outlined spin">progress_activity</span>
                    </div>
                  ) : favorites.length > 0 ? (
                    favorites.map(post => {
                      const videoData = { ...post, reelId: post.id, userId: post.userId }
                      return (
                        <div key={post.id} className="profile-post-card" onClick={() => handleVideoClick(videoData, favorites)}>
                          {post.thumbnailUrl ? (
                            <img src={post.thumbnailUrl} loading="lazy" alt="" />
                          ) : (
                            <video src={post.videoUrl} preload="metadata" />
                          )}
                          <div className="profile-video-views">
                            <span className="material-symbols-outlined">play_arrow</span>
                            {post.views || 0}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">bookmark_border</span>
                      <p>Nenhum favorito ainda</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: FOLLOWING */}
            <div id="view-following" className="profile-view-section">
              <div className="following-list">
                {followingList.length > 0 ? (
                  followingList.map(u => (
                    <div key={u.id} className="user-list-item" onClick={() => navigate(`/u/${u.userHandle}`)}>
                      <div className="user-list-avatar-container">
                        {u.avatarBase64 ? (
                          <Avatar src={u.avatarBase64} size={48} className="user-list-avatar" />
                        ) : (
                          <div className="user-list-avatar placeholder"><span className="material-symbols-outlined">person</span></div>
                        )}
                      </div>
                      <div className="user-list-info">
                        <span className="user-list-name">{u.username}</span>
                        <span className="user-list-handle">@{u.userHandle}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-msg">Não está seguindo ninguém.</p>
                )}
              </div>
            </div>

            {/* VIEW: FOLLOWERS */}
            <div id="view-followers" className="profile-view-section">
              <div className="following-list">
                {followersList.length > 0 ? (
                  followersList.map(u => (
                    <div key={u.id} className="user-list-item" onClick={() => navigate(`/u/${u.userHandle}`)}>
                      <div className="user-list-avatar-container">
                        {u.avatarBase64 ? (
                          <Avatar src={u.avatarBase64} size={48} className="user-list-avatar" />
                        ) : (
                          <div className="user-list-avatar placeholder"><span className="material-symbols-outlined">person</span></div>
                        )}
                      </div>
                      <div className="user-list-info">
                        <span className="user-list-name">{u.username}</span>
                        <span className="user-list-handle">@{u.userHandle}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-msg">Nenhum seguidor ainda.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

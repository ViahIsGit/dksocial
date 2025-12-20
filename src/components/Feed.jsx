import { useState, useEffect, useRef, useCallback } from 'react'
import { auth } from '../firebase/config'
import {
  fetchReels,
  fetchFollowingReels,
  incrementViews,
  getUserProfile
} from '../services/reels'
import VideoCard from './VideoCard'
import GlobalSearch from './GlobalSearch'
import './Feed.css'

export default function Feed() {
  const [activeTab, setActiveTab] = useState('foryou')
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentUser, setCurrentUser] = useState(auth.currentUser)

  const feedRef = useRef(null)
  const userCache = useRef({})

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => setCurrentUser(user))
    return () => unsub()
  }, [])

  const formatVideos = useCallback(async (reels) => {
    const getUserInfo = async (userId) => {
      if (userCache.current[userId]) return userCache.current[userId]
      const profile = await getUserProfile(userId)
      const info = {
        username: profile?.username || 'Usuário',
        avatar: profile?.profilePicture || '/feed/logo.png'
      }
      userCache.current[userId] = info
      return info
    }

    return Promise.all(
      reels.map(async reel => {
        const user = await getUserInfo(reel.userId)
        return {
          id: reel.id,
          ...reel,
          username: user.username,
          avatar: user.avatar,
          videoUrl: reel.videoUrl,
          description: reel.desc || '',
          likes: reel.likesUsers?.length || 0,
          isLiked: currentUser
            ? reel.likesUsers?.includes(currentUser.uid)
            : false
        }
      })
    )
  }, [currentUser])

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      let reels = []

      if (activeTab === 'following' && currentUser) {
        reels = await fetchFollowingReels(currentUser.uid)
      } else {
        reels = await fetchReels()
      }

      const formatted = await formatVideos(reels)
      setVideos(formatted)
      setActiveIndex(0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeTab, currentUser, formatVideos])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  /** 🔥 Detecta qual "página" está visível */
  const handleScroll = () => {
    if (!feedRef.current) return
    const index = Math.round(
      feedRef.current.scrollTop / window.innerHeight
    )

    if (index !== activeIndex) {
      setActiveIndex(index)
      const video = videos[index]
      if (video) incrementViews(video.id).catch(console.error)
    }
  }

  return (
    <div className="feed-container">
      <div className="feed-header">
        <button
          className={activeTab === 'following' ? 'active' : ''}
          onClick={() => setActiveTab('following')}
        >
          Seguindo
        </button>
        <button
          className={activeTab === 'foryou' ? 'active' : ''}
          onClick={() => setActiveTab('foryou')}
        >
          Para você
        </button>

        <button onClick={() => setIsSearchOpen(true)}>🔍</button>
      </div>

      <div
        ref={feedRef}
        className="feed-snap-container"
        onScroll={handleScroll}
      >
        {videos.map((video, index) => (
          <div key={video.id} className="feed-snap-item">
            <VideoCard
              video={video}
              currentUser={currentUser}
              isActive={index === activeIndex}
            />
          </div>
        ))}

        {loading && <div className="feed-loader">Carregando...</div>}
      </div>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUser={currentUser}
      />
    </div>
  )
}

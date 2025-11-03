import { useState, useEffect, useRef } from 'react'
import { auth, onAuthStateChanged } from '../firebase/config'
import { fetchReels, incrementViews } from '../services/reels'
import VideoCard from './VideoCard'
import './Feed.css'

function Feed() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    // Observar mudanças de autenticação
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  const loadInitialVideos = async () => {
    try {
      setLoading(true)
      const reels = await fetchReels()
      
      // Converter reels do Firestore para o formato esperado
      const formattedVideos = reels.map(reel => ({
        id: reel.id,
        username: reel.username || 'Usuário Anônimo',
        avatar: reel.avatar || '/feed/logo.png',
        thumbnail: reel.thumbnailUrl || reel.videoUrl,
        videoUrl: reel.videoUrl,
        description: reel.desc || '',
        duration: reel.duration || '0:00',
        timestamp: reel.timestamp || reel.createdAt?.toMillis() || Date.now(),
        likes: reel.likesUsers?.length || 0,
        comments: reel.comments || 0,
        shares: 0, // Não temos shares no Firestore ainda
        isLiked: currentUser ? reel.likesUsers?.includes(currentUser.uid) : false,
        isFavorited: currentUser ? reel.favoritesUsers?.includes(currentUser.uid) : false,
        likesUsers: reel.likesUsers || [],
        reelId: reel.id
      }))
      
      setVideos(formattedVideos)
      setHasMore(formattedVideos.length >= 50)
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadInitialVideos()
    }
  }, [currentUser])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [videos, loading, hasMore])

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    try {
      setLoading(true)
      const reels = await fetchReels()
      
      // Adicionar novos reels aos existentes
      const formattedVideos = reels.map(reel => ({
        id: reel.id,
        username: reel.username || 'Usuário Anônimo',
        avatar: reel.avatar || '/feed/logo.png',
        thumbnail: reel.thumbnailUrl || reel.videoUrl,
        videoUrl: reel.videoUrl,
        description: reel.desc || '',
        duration: reel.duration || '0:00',
        timestamp: reel.timestamp || reel.createdAt?.toMillis() || Date.now(),
        likes: reel.likesUsers?.length || 0,
        comments: reel.comments || 0,
        shares: 0,
        isLiked: currentUser ? reel.likesUsers?.includes(currentUser.uid) : false,
        isFavorited: currentUser ? reel.favoritesUsers?.includes(currentUser.uid) : false,
        likesUsers: reel.likesUsers || [],
        reelId: reel.id
      }))
      
      // Filtrar vídeos que já existem
      const existingIds = new Set(videos.map(v => v.id))
      const newVideos = formattedVideos.filter(v => !existingIds.has(v.id))
      
      if (newVideos.length > 0) {
        setVideos([...videos, ...newVideos])
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Erro ao carregar mais vídeos:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Incrementar visualizações quando o vídeo aparece
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.dataset.reelId) {
            incrementViews(entry.target.dataset.reelId).catch(console.error)
          }
        })
      },
      { threshold: 0.5 }
    )
    
    const videoCards = document.querySelectorAll('[data-reel-id]')
    videoCards.forEach(card => observer.observe(card))
    
    return () => {
      videoCards.forEach(card => observer.unobserve(card))
    }
  }, [videos])

  if (loading && videos.length === 0) {
    return (
      <div className="feed-container">
        <div className="feed-content">
          <div className="loading-indicator">
            <md-circular-progress indeterminate></md-circular-progress>
            <span>Carregando vídeos...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-container">
      <div className="feed-content">
        {videos.map((video) => (
          <div key={video.id} data-reel-id={video.reelId}>
            <VideoCard video={video} currentUser={currentUser} />
          </div>
        ))}
        
        <div ref={loadMoreRef} className="load-more-trigger">
          {loading && (
            <div className="loading-indicator">
              <md-circular-progress indeterminate></md-circular-progress>
              <span>Carregando mais vídeos...</span>
            </div>
          )}
        </div>

        {!hasMore && videos.length > 0 && (
          <div className="end-of-feed">
            <md-icon>check_circle</md-icon>
            <span>Você viu todos os vídeos!</span>
          </div>
        )}
        
        {videos.length === 0 && !loading && (
          <div className="end-of-feed">
            <md-icon>video_library</md-icon>
            <span>Nenhum vídeo encontrado</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Feed


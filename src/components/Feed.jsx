import { useState, useEffect, useRef, useCallback } from 'react'
import { auth, onAuthStateChanged } from '../firebase/config'
import { fetchReels, incrementViews, getUserProfile } from '../services/reels'
import VideoCard from './VideoCard'
import './Feed.css'

function Feed() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const loadMoreRef = useRef(null)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [lastLoadedIndex, setLastLoadedIndex] = useState(0)
  const allReelsRef = useRef([]) // Armazenar todos os reels carregados
  const userProfilesCache = useRef({}) // Cache de perfis de usuários

  useEffect(() => {
    // Observar mudanças de autenticação
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  // Função para buscar informações do usuário (com cache)
  const getUserInfo = useCallback(async (userId) => {
    if (!userId) return { username: 'Usuário Anônimo', avatar: '/feed/logo.png' }
    
    // Verificar cache primeiro
    if (userProfilesCache.current[userId]) {
      return userProfilesCache.current[userId]
    }
    
    try {
      const userProfile = await getUserProfile(userId)
      const userInfo = {
        username: userProfile?.username || 'Usuário Anônimo',
        avatar: userProfile?.profilePicture || '/feed/logo.png'
      }
      // Armazenar no cache
      userProfilesCache.current[userId] = userInfo
      return userInfo
    } catch (error) {
      console.error("Erro ao buscar perfil do usuário:", error)
      return { username: 'Usuário Anônimo', avatar: '/feed/logo.png' }
    }
  }, [])

  // Função para formatar vídeos com informações atualizadas do usuário
  const formatVideos = useCallback(async (reels, startIndex = 0, endIndex = null) => {
    const toMobileVideoUrl = (url) => {
      if (!url) return url
      try {
        const u = new URL(url)
        if (u.hostname.includes('cloudinary') && u.pathname.includes('/upload/')) {
          // Verificar se já tem transformações (contém vírgulas ou parâmetros específicos)
          const pathParts = u.pathname.split('/upload/')
          if (pathParts.length === 2) {
            const afterUpload = pathParts[1]
            // Se já tem transformações (contém vírgulas ou começa com f_, vc_, etc), usar como está
            if (afterUpload.includes(',') || afterUpload.match(/^[a-z_]+/)) {
              // Já tem transformações, usar a URL original
              return url
            }
            // Não tem transformações, adicionar
            u.pathname = `${pathParts[0]}/upload/f_mp4,vc_h264,q_auto/${afterUpload}`
            return u.toString()
          }
        }
        return url
      } catch (error) {
        console.error('Erro ao processar URL do vídeo:', error, url)
        return url
      }
    }

    const reelsToFormat = endIndex ? reels.slice(startIndex, endIndex) : reels.slice(startIndex)
    
    // Buscar informações de todos os usuários em paralelo
    const formattedVideos = await Promise.all(
      reelsToFormat.map(async (reel) => {
        // Buscar informações atualizadas do usuário
        const userInfo = await getUserInfo(reel.userId)
        
        return {
          id: reel.id,
          username: userInfo.username,
          avatar: userInfo.avatar,
          thumbnail: reel.thumbnailUrl || reel.videoUrl,
          videoUrl: toMobileVideoUrl(reel.videoUrl),
          description: reel.desc || '',
          duration: reel.duration || '0:00',
          timestamp: reel.timestamp || reel.createdAt?.toMillis() || Date.now(),
          likes: reel.likesUsers?.length || 0,
          comments: reel.comments || 0,
          shares: 0,
          isLiked: currentUser ? reel.likesUsers?.includes(currentUser.uid) : false,
          isFavorited: currentUser ? reel.favoritesUsers?.includes(currentUser.uid) : false,
          likesUsers: reel.likesUsers || [],
          reelId: reel.id,
          userId: reel.userId
        }
      })
    )
    
    return formattedVideos
  }, [getUserInfo, currentUser])

  const loadInitialVideos = useCallback(async () => {
    try {
      setLoading(true)
      // Carregar todos os reels de uma vez, mas exibir apenas os primeiros
      const allReels = await fetchReels()
      allReelsRef.current = allReels
      
      // Carregar apenas os primeiros 5 vídeos inicialmente
      const initialVideos = await formatVideos(allReels, 0, 5)
      
      setVideos(initialVideos)
      setLastLoadedIndex(5)
      setHasMore(allReels.length > 5)
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error)
    } finally {
      setLoading(false)
    }
  }, [formatVideos])

  useEffect(() => {
    loadInitialVideos()
    // Recarrega quando o usuário muda para atualizar like/favorite
  }, [loadInitialVideos, currentUser])

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
  // Controlar reprodução: apenas um vídeo ativo por vez (o mais visível)
  useEffect(() => {
    if (videos.length === 0) return

    const videoObserver = new IntersectionObserver(
      (entries) => {
        // Escolher o vídeo com maior interseção entre os visíveis
        const visible = entries
          .filter(e => e.isIntersecting && e.intersectionRatio >= 0.5)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))
        
        if (visible.length > 0) {
          const newActiveId = visible[0].target.getAttribute('data-video-id')
          
          // Se mudou o vídeo ativo, pausar o anterior e ativar o novo
          if (newActiveId && newActiveId !== activeVideoId) {
            // Primeiro, pausar o vídeo anterior se existir
            if (activeVideoId) {
              const previousVideo = document.querySelector(`[data-video-id="${activeVideoId}"]`)
              if (previousVideo) {
                previousVideo.pause()
                previousVideo.currentTime = 0 // Resetar para o início
              }
            }
            
            // Pausar todos os outros vídeos também
            const allVideos = document.querySelectorAll('.video-player')
            allVideos.forEach(video => {
              const videoId = video.getAttribute('data-video-id')
              if (videoId && videoId !== newActiveId) {
                video.pause()
                video.currentTime = 0 // Resetar para o início
              }
            })
            
            // Ativar o novo vídeo (isso vai disparar o useEffect no VideoCard que vai dar play)
            setActiveVideoId(newActiveId)
          }
        } else {
          // Se nenhum vídeo está visível o suficiente, pausar todos
          if (activeVideoId) {
            const currentVideo = document.querySelector(`[data-video-id="${activeVideoId}"]`)
            if (currentVideo) {
              currentVideo.pause()
            }
            setActiveVideoId(null)
          }
        }
      },
      { 
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-10% 0px -10% 0px' // Considerar apenas a parte central da tela
      }
    )

    // Observar todos os players de vídeo
    const players = document.querySelectorAll('.video-player')
    players.forEach(p => {
      if (p) videoObserver.observe(p)
    })
    
    return () => {
      players.forEach(p => {
        if (p) videoObserver.unobserve(p)
      })
      videoObserver.disconnect()
    }
  }, [videos, activeVideoId])

  const handlePlayRequest = (videoId) => {
    if (videoId && videoId !== activeVideoId) {
      // Pausar todos os outros vídeos
      const allVideos = document.querySelectorAll('.video-player')
      allVideos.forEach(video => {
        if (video.getAttribute('data-video-id') !== String(videoId)) {
          video.pause()
        }
      })
      setActiveVideoId(videoId)
    }
  }


  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    try {
      setLoading(true)
      
      // Carregar mais 3 vídeos do array já carregado
      const nextIndex = lastLoadedIndex + 3
      const newVideos = await formatVideos(allReelsRef.current, lastLoadedIndex, nextIndex)
      
      if (newVideos.length > 0) {
        setVideos(prev => [...prev, ...newVideos])
        setLastLoadedIndex(nextIndex)
        setHasMore(nextIndex < allReelsRef.current.length)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Erro ao carregar mais vídeos:", error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, lastLoadedIndex, formatVideos])
  
  // Observer para carregar próximo vídeo quando o usuário estiver próximo
  useEffect(() => {
    if (videos.length === 0 || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const videoIndex = parseInt(entry.target.getAttribute('data-video-index'))
            // Se estiver nos últimos 2 vídeos, carregar mais
            if (videoIndex >= videos.length - 2) {
              loadMore()
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const videoCards = document.querySelectorAll('[data-video-index]')
    videoCards.forEach(card => observer.observe(card))
    
    return () => {
      videoCards.forEach(card => observer.unobserve(card))
      observer.disconnect()
    }
  }, [videos.length, hasMore, loading, loadMore])
  
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
            <md-linear-progress value="0.5" buffer="0.8"></md-linear-progress>
            <span>Carregando vídeos...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-container">
      <div className="feed-content">
        {videos.map((video, idx) => (
          <div key={video.id} data-reel-id={video.reelId} data-video-index={idx}>
            <VideoCard 
              video={video} 
              currentUser={currentUser} 
              isFirst={idx === 0} 
              isActive={activeVideoId === String(video.id)}
              onPlayRequest={handlePlayRequest}
            />
          </div>
        ))}
        
        <div ref={loadMoreRef} className="load-more-trigger">
          {loading && (
            <div className="loading-indicator">
              <md-linear-progress value="0.5" buffer="0.8"></md-linear-progress>
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


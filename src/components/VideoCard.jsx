import { useState, useEffect, useCallback, useRef } from 'react'
import { likeReel, unlikeReel, favoriteReel, unfavoriteReel, shareReel, followUser, unfollowUser, isFollowing } from '../services/reels'
import CommentsModal from './CommentsModal'
import ShareModal from './ShareModal'
import './VideoCard.css'

function VideoCard({ video, currentUser, isFirst = false, isActive = false, onPlayRequest }) {
  const [isLiked, setIsLiked] = useState(video.isLiked || false)
  const [isFavorited, setIsFavorited] = useState(video.isFavorited || false)
  const [isPlaying, setIsPlaying] = useState(!isFirst)
  const [isMuted, setIsMuted] = useState(isFirst ? true : false)
  const videoRef = useRef(null)
  const [likes, setLikes] = useState(video.likes || 0)
  const [shares, setShares] = useState(video.shares || 0)
  const [showComments, setShowComments] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })
  const alertDialogRef = useRef(null)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  
  useEffect(() => {
    setIsLiked(video.isLiked || false)
    setIsFavorited(video.isFavorited || false)
    setLikes(video.likes || 0)
    setShares(video.shares || 0)
  }, [video])

  // Verificar se está seguindo o usuário e se são amigos
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !video.userId || video.userId === currentUser.uid) return
      
      try {
        const following = await isFollowing(video.userId, currentUser.uid)
        setIsFollowingUser(following)
        
        // Verificar se são amigos (follow mútuo)
        if (following) {
          const mutualFollow = await isFollowing(currentUser.uid, video.userId)
          setIsFriend(mutualFollow)
        } else {
          setIsFriend(false)
        }
      } catch (error) {
        console.error("Erro ao verificar status de follow:", error)
      }
    }
    
    checkFollowStatus()
  }, [currentUser, video.userId])

  // Controlar o md-dialog usando os métodos show() e close()
  useEffect(() => {
    if (alertDialogRef.current) {
      if (alertDialog.open) {
        alertDialogRef.current.show()
      } else {
        alertDialogRef.current.close()
      }
    }
  }, [alertDialog.open])

  // Função para dar like (pode ser chamada pelo botão ou double tap)
  const performLike = useCallback(async () => {
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para curtir vídeos' })
      return
    }
    
    try {
      if (isLiked) {
        await unlikeReel(video.reelId, currentUser.uid)
        setIsLiked(false)
        setLikes(prev => Math.max(0, prev - 1))
      } else {
        await likeReel(video.reelId, currentUser.uid)
        setIsLiked(true)
        setLikes(prev => prev + 1)
      }
    } catch (error) {
      console.error("Erro ao curtir/descurtir:", error)
      setAlertDialog({ open: true, title: 'Erro', message: 'Erro ao curtir vídeo' })
    }
  }, [currentUser, video.reelId, isLiked])

  const handleLike = async (e) => {
    e.stopPropagation()
    await performLike()
  }
  
  const handleFavorite = async (e) => {
    e.stopPropagation()
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para favoritar vídeos' })
      return
    }
    
    try {
      if (isFavorited) {
        await unfavoriteReel(video.reelId, currentUser.uid)
        setIsFavorited(false)
      } else {
        await favoriteReel(video.reelId, currentUser.uid)
        setIsFavorited(true)
      }
    } catch (error) {
      console.error("Erro ao favoritar/desfavoritar:", error)
      setAlertDialog({ open: true, title: 'Erro', message: 'Erro ao favoritar vídeo' })
    }
  }

  const handlePlay = () => {
    const videoElement = videoRef.current || document.querySelector(`[data-video-id="${video.id}"]`)
    if (videoElement) {
      if (isPlaying) {
        // Pausar este vídeo
        videoElement.pause()
        setIsPlaying(false)
      } else {
        // Pausar todos os outros vídeos antes de dar play neste
        const allVideos = document.querySelectorAll('.video-player')
        allVideos.forEach(v => {
          if (v.getAttribute('data-video-id') !== String(video.id)) {
            v.pause()
          }
        })
        
        // Desmutar se necessário
        if (isFirst && isMuted) {
          videoElement.muted = false
          setIsMuted(false)
        }
        
        // Dar play neste vídeo
        videoElement.play()
          .then(() => {
            setIsPlaying(true)
            if (onPlayRequest) onPlayRequest(String(video.id))
          })
          .catch(console.error)
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleToggleMute = (e) => {
    e.stopPropagation()
    const videoElement = document.querySelector(`[data-video-id="${video.id}"]`)
    if (!videoElement) return
    const nextMuted = !isMuted
    videoElement.muted = nextMuted
    setIsMuted(nextMuted)
    if (!nextMuted) {
      // Garantir play com som após gesto do usuário
      videoElement.play().catch(() => {})
    }
  }

  // Double tap/click para dar like
  const lastTapRef = useRef(0)
  const tapTimeoutRef = useRef(null)

  useEffect(() => {
    const container = document.querySelector(`[data-video-card-id="${video.id}"]`)
    if (!container) return

    // Double tap para mobile
    const handleTouchStart = (e) => {
      // Não interferir em toques nos botões de ação
      if (e.target.closest('.video-actions-right')) {
        return
      }

      const currentTime = new Date().getTime()
      const tapLength = currentTime - lastTapRef.current
      
      if (tapLength < 400 && tapLength > 0) {
        e.preventDefault()
        e.stopPropagation()
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current)
        }
        lastTapRef.current = 0
        performLike()
      } else {
        lastTapRef.current = currentTime
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current)
        }
        tapTimeoutRef.current = setTimeout(() => {
          lastTapRef.current = 0
        }, 400)
      }
    }

    // Double click para desktop
    const handleDoubleClick = (e) => {
      // Não interferir em cliques nos botões de ação
      if (e.target.closest('.video-actions-right')) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      performLike()
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('dblclick', handleDoubleClick)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('dblclick', handleDoubleClick)
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
    }
  }, [video.id, performLike])
  
  useEffect(() => {
    const videoElement = videoRef.current || document.querySelector(`[data-video-id="${video.id}"]`)
    if (videoElement) {
      // Forçar atributos para autoplay inline e mudo por padrão (desbloqueia autoplay em mobile)
      videoElement.setAttribute('playsinline', '')
      videoElement.muted = isMuted
      
      // Verificar se a URL do vídeo é válida
      if (video.videoUrl) {
        videoElement.src = video.videoUrl
        // Adicionar listener para erros de carregamento
        const handleError = (e) => {
          console.error('Erro ao carregar vídeo:', e, video.videoUrl)
          // Tentar usar a URL original sem transformações se houver erro
          if (video.videoUrl.includes('cloudinary') && video.videoUrl.includes(',')) {
            const originalUrl = video.videoUrl.replace(/\/upload\/[^/]+\//, '/upload/')
            videoElement.src = originalUrl
          }
        }
        videoElement.addEventListener('error', handleError)
        
        // Não dar autoplay aqui - será controlado pelo isActive
        videoElement.addEventListener('ended', () => {
          setIsPlaying(false)
        })
        
        return () => {
          videoElement.removeEventListener('ended', () => {})
          videoElement.removeEventListener('error', handleError)
        }
      }
    }
  }, [video.id, video.videoUrl, isMuted])

  // Reagir à ativação/desativação vinda do Feed
  useEffect(() => {
    const videoElement = videoRef.current || document.querySelector(`[data-video-id="${video.id}"]`)
    if (!videoElement) return
    
    if (isActive) {
      // Quando este vídeo se torna ativo, pausar todos os outros primeiro
      const allVideos = document.querySelectorAll('.video-player')
      allVideos.forEach(v => {
        const vidId = v.getAttribute('data-video-id')
        if (vidId && vidId !== String(video.id)) {
          v.pause()
        }
      })
      
      // Dar play neste vídeo
      const playPromise = videoElement.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.log('Erro ao dar play:', error)
            setIsPlaying(false)
          })
      } else {
        setIsPlaying(true)
      }
    } else {
      // Quando este vídeo não está mais ativo, pausar imediatamente
      videoElement.pause()
      setIsPlaying(false)
    }
  }, [isActive, video.id])

  const handleShareClick = () => {
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para compartilhar vídeos' })
      return
    }
    setShowShareModal(true)
  }

  const handleShare = async () => {
    try {
      await shareReel(video.reelId, currentUser.uid)
      setShares(shares + 1)
    } catch (error) {
      console.error("Erro ao compartilhar:", error)
      setAlertDialog({ open: true, title: 'Erro', message: 'Erro ao compartilhar vídeo' })
    }
  }

  const handleFollow = async (e) => {
    e.stopPropagation()
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para seguir usuários' })
      return
    }
    
    if (video.userId === currentUser.uid) return
    
    try {
      if (isFollowingUser) {
        await unfollowUser(video.userId, currentUser.uid)
        setIsFollowingUser(false)
        setIsFriend(false)
      } else {
        await followUser(video.userId, currentUser.uid)
        setIsFollowingUser(true)
        // Verificar se agora são amigos
        const mutualFollow = await isFollowing(currentUser.uid, video.userId)
        setIsFriend(mutualFollow)
      }
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir:", error)
      setAlertDialog({ open: true, title: 'Erro', message: 'Erro ao seguir usuário' })
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  return (
    <div className="video-card" data-video-card-id={video.id}>
      <div className="video-container">
        <video
          className="video-player"
          data-video-id={video.id}
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnail}
          preload="metadata"
          crossOrigin="anonymous"
          loop
          playsInline
          muted={isMuted}
          autoPlay
          onClick={handlePlay}
          style={{ display: isPlaying ? 'block' : 'none' }}
        />
        <div 
          className="video-thumbnail"
          style={{ 
            backgroundImage: `url(${video.thumbnail || video.videoUrl})`,
            display: isPlaying ? 'none' : 'block'
          }}
          onClick={handlePlay}
        >
          {!isPlaying && (
            <div className="play-button" onClick={(e) => { e.stopPropagation(); handlePlay(); }}>
              <md-icon>play_circle</md-icon>
            </div>
          )}
          {isPlaying && (
            <div className="pause-overlay" onClick={handlePlay}>
              <md-icon>pause_circle</md-icon>
            </div>
          )}
          {/* Botão de som */}
          <div className="mute-toggle" onClick={handleToggleMute}>
            <md-icon>{isMuted ? 'volume_off' : 'volume_up'}</md-icon>
          </div>
        </div>
        
        <div className="video-duration-badge">{video.duration}</div>
      </div>

      {/* Ações à direita */}
      <div className="video-actions-right">
        <div className={`action-button ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          <md-icon className={isLiked ? 'liked' : ''}>
            {isLiked ? 'favorite' : 'favorite_border'}
          </md-icon>
          <span>{formatNumber(likes)}</span>
        </div>
        
        <div className="action-button" onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
          <md-icon>chat_bubble_outline</md-icon>
          <span>{formatNumber(video.comments || 0)}</span>
        </div>
        
        <div className="action-button action-button-share" onClick={(e) => { e.stopPropagation(); handleShareClick(); }}>
          <md-icon>share</md-icon>
          <span>{formatNumber(shares)}</span>
        </div>
        
        <div className={`action-button ${isFavorited ? 'favorited' : ''}`} onClick={handleFavorite}>
          <md-icon className={isFavorited ? 'favorited' : ''}>
            {isFavorited ? 'bookmark' : 'bookmark_border'}
          </md-icon>
        </div>
      </div>

      {/* Info na parte inferior esquerda */}
      <div className="video-info">
        <div className="video-main-info">
          <div className="video-avatar">
            <img src={video.avatar} alt={video.username} />
          </div>
          <div className="video-details">
            <div className="video-header">
              <span className="video-username">@{video.username}</span>
              {isFriend && (
                <span className="video-friend-badge" title="Amigo">
                  <md-icon>group</md-icon>
                </span>
              )}
              {currentUser && video.userId && video.userId !== currentUser.uid && (
                <button 
                  className={`video-follow-button ${isFollowingUser ? 'following' : ''} ${isFriend ? 'friend' : ''}`}
                  onClick={handleFollow}
                >
                  {isFriend ? (
                    <md-icon>group</md-icon>
                  ) : isFollowingUser ? (
                    <md-icon>check</md-icon>
                  ) : (
                    <md-icon>person_add</md-icon>
                  )}
                </button>
              )}
              <span className="video-time">{formatTime(video.timestamp)}</span>
            </div>
            <p className="video-description">{video.description}</p>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentsModal
          reelId={video.reelId}
          onClose={() => setShowComments(false)}
          currentUser={currentUser}
        />
      )}

      {showShareModal && (
        <ShareModal
          video={video}
          onClose={() => setShowShareModal(false)}
          currentUser={currentUser}
          onShare={handleShare}
        />
      )}

      <md-dialog 
        ref={alertDialogRef}
        onClose={() => setAlertDialog({ open: false, title: '', message: '' })}
      >
        <div slot="headline">{alertDialog.title}</div>
        <form slot="content" method="dialog">
          <p>{alertDialog.message}</p>
        </form>
        <div slot="actions">
          <md-text-button onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>Ok</md-text-button>
        </div>
      </md-dialog>
    </div>
  )
}

export default VideoCard

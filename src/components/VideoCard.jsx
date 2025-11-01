import { useState, useEffect, useCallback, useRef } from 'react'
import { likeReel, unlikeReel, favoriteReel, unfavoriteReel, shareReel } from '../services/reels'
import CommentsModal from './CommentsModal'
import ShareModal from './ShareModal'
import AlertDialog from './AlertDialog'
import './VideoCard.css'

function VideoCard({ video, currentUser }) {
  const [isLiked, setIsLiked] = useState(video.isLiked || false)
  const [isFavorited, setIsFavorited] = useState(video.isFavorited || false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [likes, setLikes] = useState(video.likes || 0)
  const [shares, setShares] = useState(video.shares || 0)
  const [showComments, setShowComments] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })
  
  useEffect(() => {
    setIsLiked(video.isLiked || false)
    setIsFavorited(video.isFavorited || false)
    setLikes(video.likes || 0)
    setShares(video.shares || 0)
  }, [video])

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
    const videoElement = document.querySelector(`[data-video-id="${video.id}"]`)
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause()
        setIsPlaying(false)
      } else {
        videoElement.play().catch(console.error)
        setIsPlaying(true)
      }
    } else {
      setIsPlaying(!isPlaying)
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
    const videoElement = document.querySelector(`[data-video-id="${video.id}"]`)
    if (videoElement) {
      videoElement.addEventListener('ended', () => {
        setIsPlaying(false)
      })
      
      return () => {
        videoElement.removeEventListener('ended', () => {})
      }
    }
  }, [video.id])

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
          src={video.videoUrl}
          poster={video.thumbnail}
          loop
          playsInline
          muted
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

      <AlertDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog({ open: false, title: '', message: '' })}
      />
    </div>
  )
}

export default VideoCard

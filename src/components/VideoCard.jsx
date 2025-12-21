import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { likeReel, unlikeReel, favoriteReel, unfavoriteReel, shareReel, followUser, unfollowUser, isFollowing } from '../services/reels'
import { useLayout } from '../context/LayoutContext'
import CommentsModal from './CommentsModal'
import ShareModal from './ShareModal'
import './VideoCard.css'

function VideoCard({ video, currentUser, isFirst = false, isActive = false, onPlayRequest }) {
  const navigate = useNavigate()
  const { setBottomNavHidden } = useLayout()
  const [isLiked, setIsLiked] = useState(video.isLiked || false)
  const [isFavorited, setIsFavorited] = useState(video.isFavorited || false)
  const [isPlaying, setIsPlaying] = useState(false)
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

  // Custom Player State
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(false)

  // Slideshow State
  const [currentSlide, setCurrentSlide] = useState(0)
  const isSlideshow = video.type === 'slideshow' || (video.mediaUrls && video.mediaUrls.length > 1)
  const slides = video.mediaUrls || [video.videoUrl]

  useEffect(() => {
    setIsLiked(video.isLiked || false)
    setIsFavorited(video.isFavorited || false)
    setLikes(video.likes || 0)
    setShares(video.shares || 0)
  }, [video])

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration || 1
      setCurrentTime(current)
      setProgress((current / total) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleWaiting = () => setIsBuffering(true)
  const handleCanPlay = () => setIsBuffering(false)

  const handleEnded = () => {
    setIsPlaying(true)
    if (videoRef.current) {
      videoRef.current.play().catch(() => { })
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    if (onPlayRequest) onPlayRequest(String(video.id))
  }

  const handlePause = () => setIsPlaying(false)

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return

    if (videoRef.current.paused) {
      videoRef.current.play().catch(err => console.log('Play error:', err))
    } else {
      videoRef.current.pause()
    }
  }, [])

  // Seek Handler
  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value)
    if (videoRef.current && duration) {
      const newTime = (newProgress / 100) * duration
      videoRef.current.currentTime = newTime
      setProgress(newProgress)
      setCurrentTime(newTime)
    }
  }

  // Speed Control
  const toggleSpeed = (e) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2, 0.5]
    const nextSpeedIndex = speeds.indexOf(playbackRate) + 1
    const nextSpeed = speeds[nextSpeedIndex % speeds.length]
    setPlaybackRate(nextSpeed)
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed
    }
  }

  // Handle Active State
  useEffect(() => {
    if (isActive) {
      if (!isSlideshow && videoRef.current) {
        const playPromise = videoRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Autoplay prevented:', err)
            setIsPlaying(false)
          })
        }
      } else if (isSlideshow) {
        setIsPlaying(true)
      }
    } else {
      if (!isSlideshow && videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
      setIsPlaying(false)
    }
  }, [isActive, isSlideshow])

  // Slideshow Auto-play
  useEffect(() => {
    let interval
    if (isSlideshow && isPlaying && !isBuffering) {
      interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isSlideshow, isPlaying, isBuffering, slides.length])

  const handleSlideNav = (direction, e) => {
    e.stopPropagation()
    if (direction === 'next') {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    } else {
      setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)
    }
  }

  // Mute Control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])


  // Follow Status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !video.userId || video.userId === currentUser.uid) return

      try {
        const following = await isFollowing(video.userId, currentUser.uid)
        setIsFollowingUser(following)

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

  // Dialog Control
  useEffect(() => {
    if (alertDialogRef.current) {
      if (alertDialog.open) {
        alertDialogRef.current.show()
      } else {
        alertDialogRef.current.close()
      }
    }
  }, [alertDialog.open])

  // Like Logic
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

  const handleToggleMute = (e) => {
    e.stopPropagation()
    setIsMuted(prev => !prev)
  }

  // Gestures
  const lastTapRef = useRef(0)
  const tapTimeoutRef = useRef(null)

  useEffect(() => {
    const container = document.querySelector(`[data-video-card-id="${video.id}"]`)
    if (!container) return

    const handleTouchStart = (e) => {
      if (e.target.closest('.video-actions-right') ||
        e.target.closest('.video-info') ||
        e.target.closest('.video-controls-container')) {
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
          if (!e.defaultPrevented) {
            togglePlay()
          }
        }, 400)
      }
    }

    const handleDoubleClick = (e) => {
      if (e.target.closest('.video-actions-right') ||
        e.target.closest('.video-info') ||
        e.target.closest('.video-controls-container')) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      performLike()
    }

    const handleClick = (e) => {
      if (e.target.closest('.video-actions-right') ||
        e.target.closest('.video-info') ||
        e.target.closest('.video-controls-container')) {
        return
      }
      togglePlay()
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('dblclick', handleDoubleClick)
    container.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('dblclick', handleDoubleClick)
      container.removeEventListener('click', handleClick)
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
    }
  }, [video.id, performLike, togglePlay])

  const handleShareClick = () => {
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para compartilhar vídeos' })
      return
    }
    setBottomNavHidden(true)
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

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="video-card" data-video-card-id={video.id}>
      <div className="video-container">
        {!isSlideshow ? (
          <>
            <video
              ref={videoRef}
              className="custom-video-player"
              src={video.videoUrl}
              poster={video.thumbnail || video.videoUrl}
              playsInline
              loop
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
            />

            {/* Buffering Indicator */}
            {isBuffering && (
              <div className="buffering-indicator">
                <md-circular-progress indeterminate></md-circular-progress>
              </div>
            )}

            {/* Play/Pause Overlay Icon */}
            {!isPlaying && !isBuffering && (
              <div className="pause-overlay">
                <md-icon>play_arrow</md-icon>
              </div>
            )}

            {/* Mute Toggle */}
            <div className="mute-toggle" onClick={handleToggleMute}>
              <md-icon>{isMuted ? 'volume_off' : 'volume_up'}</md-icon>
            </div>

            {/* Speed Control */}
            <div className="speed-toggle" onClick={toggleSpeed}>
              <span>{playbackRate}x</span>
            </div>

            {/* Custom Controls Container */}
            <div className="video-controls-container" onClick={(e) => e.stopPropagation()}>
              <div className="video-seeker-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="video-seeker"
                />
                <div className="video-time-display">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="slideshow-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={slides[currentSlide]}
              alt={`Slide ${currentSlide}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Slideshow Indicators */}
            <div className="slideshow-indicators" style={{
              position: 'absolute',
              bottom: '100px',
              left: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              gap: '4px',
              zIndex: 15
            }}>
              {slides.map((_, idx) => (
                <div key={idx} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: idx === currentSlide ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.3s',
                  transform: idx === currentSlide ? 'scale(1.2)' : 'scale(1)'
                }} />
              ))}
            </div>

            {/* Navigation Zones */}
            <div
              style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 10 }}
              onClick={(e) => handleSlideNav('prev', e)}
            />
            <div
              style={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 10 }}
              onClick={(e) => handleSlideNav('next', e)}
            />
          </div>
        )}
      </div>

{/* Ações à direita */}
<div className="video-actions-right">
  <div className="video-avatar">
    <img src={video.avatar} alt={video.username} />

    {currentUser &&
      video.userId &&
      video.userId !== currentUser.uid &&
      !isFollowingUser &&
      !isFriend && (
        <button
          className="video-follow-badge"
          onClick={handleFollow}
        >
          <md-icon>add</md-icon>
        </button>
      )}

    {isFollowingUser && !isFriend && (
      <div className="video-follow-badge following">
        <md-icon>check</md-icon>
      </div>
    )}
  </div>

  <div className={`action-button ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
    <md-icon className={isLiked ? 'liked' : ''}>
      favorite
    </md-icon>
    <span>{formatNumber(likes)}</span>
  </div>

  <div
    className="action-button"
    onClick={(e) => {
      e.stopPropagation()
      setShowComments(true)
    }}
  >
    <md-icon>comment</md-icon>
    <span>{formatNumber(video.comments || 0)}</span>
  </div>

  <div
    className="action-button action-button-share"
    onClick={(e) => {
      e.stopPropagation()
      handleShareClick()
    }}
  >
    <md-icon>share</md-icon>
    <span>{formatNumber(shares)}</span>
  </div>

  <div
    className={`action-button ${isFavorited ? 'favorited' : ''}`}
    onClick={handleFavorite}
  >
    <md-icon className={isFavorited ? 'favorited' : ''}>
      bookmark
    </md-icon>
  </div>
</div>


      {/* Info na parte inferior esquerda */}
      <div className="video-info">
        <div className="video-main-info">
          <div className="video-details">
            <div className="video-header">
              <span className="video-username">@{video.username}</span>
              {isFriend && (
                <span className="video-friend-badge" title="Amigo">
                  <md-icon>group</md-icon>
                </span>
              )}
              <span className="video-time">{formatTime(video.timestamp)}</span>
            </div>
            <p className="video-description">{video.description}</p>

            {/* Music Ticker */}
            <div className="video-music" onClick={(e) => {
              e.stopPropagation()
              navigate(`/music/${video.username}`)
            }}>
              <md-icon>music_note</md-icon>
              <div className="music-ticker-container">
                <div className="music-ticker-text">
                  Som original - @{video.username}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {
        showComments && (
          <CommentsModal
            reelId={video.reelId}
            onClose={() => setShowComments(false)}
            currentUser={currentUser}
          />
        )
      }

      {
        showShareModal && (
          <ShareModal
            video={video}
            onClose={() => {
              setShowShareModal(false)
              setBottomNavHidden(false)
            }}
            currentUser={currentUser}
            onShare={handleShare}
          />
        )
      }

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

import { useState } from 'react'
import './ShareModal.css'

function ShareModal({ video, onClose, currentUser, onShare }) {
  const [sharing, setSharing] = useState(false)

  const handleShare = async (platform) => {
    if (!currentUser) {
      return
    }

    setSharing(true)
    const shareUrl = `${window.location.origin}?reel=${video.reelId}`
    const shareText = `Vídeo de @${video.username} - ${video.description || ''}`
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)

    try {
      switch (platform) {
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank')
          break
        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank')
          break
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
          break
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
          break
        case 'copy':
          await navigator.clipboard.writeText(shareUrl)
          if (onShare) {
            await onShare()
          }
          break
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: `Vídeo de @${video.username}`,
              text: video.description,
              url: shareUrl
            })
            if (onShare) {
              await onShare()
            }
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    } finally {
      setSharing(false)
    }
  }

  const shareOptions = [
    { id: 'native', label: 'Compartilhar', icon: 'share', available: !!navigator.share },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', available: true },
    { id: 'telegram', label: 'Telegram', icon: 'send', available: true },
    { id: 'twitter', label: 'Twitter', icon: 'article', available: true },
    { id: 'facebook', label: 'Facebook', icon: 'public', available: true },
    { id: 'copy', label: 'Copiar link', icon: 'link', available: true }
  ].filter(option => option.available)

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-header">
          <h2 className="share-title">Compartilhar</h2>
          <md-icon-button onClick={onClose} className="close-button">
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>

        <div className="share-options">
          {shareOptions.map((option) => (
            <button
              key={option.id}
              className="share-option-item"
              onClick={() => handleShare(option.id)}
              disabled={sharing}
            >
              <div className="share-option-icon">
                <md-icon>{option.icon}</md-icon>
              </div>
              <span className="share-option-label">{option.label}</span>
            </button>
          ))}
        </div>

        {!currentUser && (
          <div className="share-login-prompt">
            <p>Faça login para compartilhar</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareModal


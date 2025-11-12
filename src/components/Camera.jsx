import { useEffect, useRef, useState } from 'react'
import { createReel } from '../services/reels'
import { useLayout } from '../context/LayoutContext'
import './Camera.css'

function Camera() {
  const { hideChrome, showChrome } = useLayout()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [chunks, setChunks] = useState([])
  const [recording, setRecording] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [desc, setDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dialog, setDialog] = useState({ open: false, title: '', message: '' })
  const dialogRef = useRef(null)
  const [mode, setMode] = useState('photo') // 'photo' | 'video'
  const [facingMode, setFacingMode] = useState('user') // 'user' | 'environment'
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    hideChrome()
    // Não chamamos getUserMedia automaticamente para garantir prompt por gesto do usuário.
    if (!window.isSecureContext) {
      setCameraError('Requer HTTPS para acessar a câmera. Abra o site em https.')
    } else {
      setCameraError('')
    }
    return () => {
      stopCamera()
      showChrome()
    }
  }, [hideChrome, showChrome, facingMode])

  // Controlar o md-dialog usando os métodos show() e close()
  useEffect(() => {
    if (dialogRef.current) {
      if (dialog.open) {
        dialogRef.current.show()
      } else {
        dialogRef.current.close()
      }
    }
  }, [dialog.open])

  const startCamera = async () => {
    try {
      const getUM = async (constraints) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(constraints)
        }
        const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia
        if (legacy) {
          return new Promise((res, rej) => legacy.call(navigator, constraints, res, rej))
        }
        throw new Error('getUserMedia não suportado neste navegador. Use HTTPS e um navegador atualizado.')
      }
      const media = await getUM({ video: { facingMode }, audio: true })
      setStream(media)
      setCameraError('')
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
    } catch (e) {
      setCameraError(e.message || 'Falha ao acessar a câmera')
      throw e
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!stream) return
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    setChunks([])
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        setChunks(prev => [...prev, e.data])
      }
    }
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const file = new File([blob], `camera-${Date.now()}.webm`, { type: 'video/webm' })
      setSelectedFile(file)
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' })
      setCapturedPhoto(URL.createObjectURL(blob))
      setSelectedFile(file)
    }, 'image/png')
  }

  const handlePickFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setDialog({ open: true, title: 'Nenhum arquivo', message: 'Capture ou selecione um arquivo primeiro.' })
      return
    }
    try {
      setUploading(true)
      setProgress(0.1)
      const thumbnailFile = capturedPhoto ? undefined : null
      const res = await createReel({
        videoFile: selectedFile,
        thumbnailFile: thumbnailFile,
        desc,
        onProgress: (p) => setProgress(Math.min(0.95, p / 100))
      })
      setProgress(1)
      setDialog({ open: true, title: 'Sucesso', message: 'Post enviado com sucesso!' })
      console.log(res)
    } catch (e) {
      setDialog({ open: true, title: 'Erro ao enviar', message: e.message })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 500)
    }
  }

  return (
    <div className="camera-page">
      {/* Preview em tela cheia */}
      <video ref={videoRef} playsInline muted className="camera-video" />
      <canvas ref={canvasRef} className="camera-canvas" style={{ display: 'none' }} />

      {/* Top bar */}
      <div className="camera-topbar">
        <md-icon-button aria-label="Flash"><md-icon>flash_auto</md-icon></md-icon-button>
        <md-icon-button aria-label="Trocar câmera" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}>
          <md-icon>cameraswitch</md-icon>
        </md-icon-button>
        <md-icon-button aria-label="Upload" onClick={() => document.getElementById('file-input')?.click()}>
          <md-icon>photo_library</md-icon>
        </md-icon-button>
        <input id="file-input" type="file" accept="video/*,image/*" onChange={handlePickFile} style={{ display: 'none' }} />
      </div>

      {/* Prompt para habilitar câmera em caso de erro/permissão */}
      {(!stream) && (
        <div className="camera-permission">
          <div className="camera-permission-card">
            <md-icon style={{ fontSize: 48 }}>videocam</md-icon>
            <p>{cameraError || 'Precisamos de acesso à câmera para continuar.'}</p>
            <md-filled-button onClick={() => startCamera().catch(() => {})}>Ativar câmera</md-filled-button>
            {cameraError && (
              <md-text-button onClick={() => setCameraError('')}>Tentar novamente</md-text-button>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="camera-bottombar">
        <div className="mode-switch">
          <button className={`mode-btn ${mode === 'photo' ? 'active' : ''}`} onClick={() => setMode('photo')}>FOTO</button>
          <button className={`mode-btn ${mode === 'video' ? 'active' : ''}`} onClick={() => setMode('video')}>VÍDEO</button>
        </div>
        <div className="shutter-row">
          <md-icon-button className="side-btn" onClick={() => setDesc(prompt('Legenda') || '')} aria-label="Legenda">
            <md-icon>title</md-icon>
          </md-icon-button>
          <button
            className={`shutter ${recording ? 'recording' : ''}`}
            onClick={() => (mode === 'photo' ? capturePhoto() : toggleRecording())}
            aria-label={mode === 'photo' ? 'Capturar foto' : (recording ? 'Parar gravação' : 'Iniciar gravação')}
          >
            <span className="inner" />
          </button>
          <md-icon-button className="side-btn" onClick={handleUpload} aria-label="Postar">
            <md-icon>send</md-icon>
          </md-icon-button>
        </div>
        {selectedFile && (
          <div className="selection-info">
            <md-icon>attach_file</md-icon>
            <span>{selectedFile.name} • {(selectedFile.size/1024/1024).toFixed(1)} MB</span>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="camera-progress">
          <md-linear-progress value={progress} buffer={Math.max(progress, 0.8)}></md-linear-progress>
        </div>
      )}

      <md-dialog 
        ref={dialogRef}
        onClose={() => setDialog({ open: false, title: '', message: '' })}
      >
        <div slot="headline">{dialog.title}</div>
        <form slot="content" method="dialog">
          <p>{dialog.message}</p>
        </form>
        <div slot="actions">
          <md-text-button onClick={() => setDialog({ open: false, title: '', message: '' })}>Ok</md-text-button>
        </div>
      </md-dialog>
    </div>
  )
}

export default Camera



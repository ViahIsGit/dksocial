import './Download.css'

export default function Download() {
  return (
    <div className="download-page">
      <div className="download-card">

        <img
          src="/feed/logo.png"
          alt="App Logo"
          className="download-logo"
        />

        <h1 className="download-title">Baixe o app</h1>
        <p className="download-subtitle">
          Tenha a melhor experiência usando o app nativo
        </p>

        <div className="download-actions">

          <a
            href="/app/app-release.apk"
            className="download-btn primary"
            download
          >
            <span className="material-symbols-outlined">download</span>
            Baixar APK
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=com.seuapp"
            target="_blank"
            rel="noopener noreferrer"
            className="download-btn tonal"
          >
            <span className="material-symbols-outlined">shop</span>
            Play Store
          </a>

        </div>

        <span className="download-note">
          Compatível com Android 8+
        </span>

      </div>
    </div>
  )
}

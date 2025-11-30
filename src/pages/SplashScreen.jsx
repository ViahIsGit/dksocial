import { useTheme } from '../context/ThemeContext';
import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen" role="img" aria-label="Tela inicial do DK Material">
      <div className="splash-content">
        <img src="/logo.png" alt="Logo DK" className="splash-logo" />
      </div>
    </div>
  );
}

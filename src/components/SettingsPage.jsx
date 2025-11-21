import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import './SettingsPage.css'

export default function SettingsPage() {
    const navigate = useNavigate()
    const { hideChrome, showChrome } = useLayout()

    useEffect(() => {
        hideChrome()
        return () => showChrome()
    }, [hideChrome, showChrome])

    return (
        <div className="settings-page">
            <div className="settings-header">
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
                <h1>Configurações</h1>
            </div>

            <div className="settings-content">
                <div className="settings-section">
                    <h2>Conta</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>person</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Informações Pessoais</span>
                            <p>Atualize seus dados</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>lock</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Segurança</span>
                            <p>Senha e autenticação</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Preferências</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>notifications</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Notificações</span>
                            <p>Gerenciar alertas</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>dark_mode</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Aparência</span>
                            <p>Tema e cores</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Sobre</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>info</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Sobre o App</span>
                            <p>Versão 1.0.0</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                </div>
            </div>
        </div>
    )
}

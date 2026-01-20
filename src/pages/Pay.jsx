import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import '@material/web/button/filled-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import './Pay.css'
import StripePayment from '../components/StripePayment'

export default function Pay() {
    const navigate = useNavigate()
    const { setBottomNavHidden } = useLayout()

    useEffect(() => {
        setBottomNavHidden(true)
        return () => setBottomNavHidden(false)
    }, [setBottomNavHidden])

    return (
        <div className="pay-page">
            <div className="pay-header">
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
                <h2>Upgrade to Pro</h2>
            </div>

            <div className="pay-content">
                <div className="premium-card">
                    <md-icon className="premium-icon">diamond</md-icon>
                    <h1 className="premium-title">Yoky Pro Lifetime</h1>
                    <p className="premium-subtitle">
                        One-time payment. Forever yours.
                    </p>
                </div>

                <div className="benefits-section">
                    <h3 className="benefits-title">What's included</h3>
                    <ul className="benefits-list">
                        {[
                            'Access to GPT-4 & Claude 3 Opus',
                            'Advanced Personalities (Coder, Creative)',
                            'Unlimited Messages',
                            'Priority Support',
                            'Early Access to New Features',
                            'No Recurring Fees'
                        ].map((item, i) => (
                            <li key={i} className="benefit-item">
                                <md-icon>check_circle</md-icon>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="cta-section">
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>R$ 1,00</h3>
                        <span style={{ opacity: 0.7 }}>one-time</span>
                    </div>

                    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                        <StripePayment />
                    </div>

                    <p className="secure-note">
                        <md-icon>lock</md-icon>
                        Secure payment via Stripe (Google Pay).
                    </p>
                </div>
            </div>
        </div>
    )
}

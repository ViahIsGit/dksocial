import React from 'react';
import { useNavigate } from 'react-router-dom';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export default function Terms() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '2rem 1rem', background: 'var(--md-sys-color-surface)', minHeight: '100vh', color: 'var(--md-sys-color-on-surface)', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ marginBottom: '2rem' }}>
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)', marginBottom: '1rem' }}>Terms of Service</h1>
                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Last updated: January 2026</p>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                    <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                        By accessing and using DKSocial, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>2. User Content</h2>
                    <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                        You retain all rights to any content you submit, post or display on or through the services. By submitting content, you grant DKSocial a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>3. Privacy Policy</h2>
                    <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                        Your privacy is important to us. Please read our Privacy Policy to understand how we collect, use, and share your personal information.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>4. Community Guidelines</h2>
                    <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                        We want DKSocial to be a safe place. Bullying, harassment, hate speech, and illegal content are strictly prohibited and will result in account termination.
                    </p>
                </section>

                {/* Nova seção adicionada para conformidade com CSAE */}
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>5. Child Safety & Zero Tolerance</h2>
                    <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                        DKSocial has a zero-tolerance policy against Child Sexual Abuse and Exploitation (CSAE). 
                        <br /><br />
                        It is strictly prohibited to publish, share, or solicit any content that depicts the sexual exploitation of minors. 
                        Any content identified as CSAE will be removed immediately without prior notice. The accounts responsible will be permanently banned, 
                        and we will report the content and user details to appropriate law enforcement agencies and the National Center for Missing & Exploited Children (NCMEC).
                    </p>
                </section>
            </div>
        </div>
    );
}

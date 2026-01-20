import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '@material/web/icon/icon.js';
import '@material/web/switch/switch.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/progress/circular-progress.js';
import './SettingsPage.css';

// Firebase
import { auth, db, doc, updateDoc, onSnapshot } from '../firebase/config';
import { updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';

// Context
import { useTheme } from '../context/ThemeContext';

const SETTINGS_DATA = [
    { id: 'account', icon: 'person', title: 'Account Center', subtitle: 'Personal details, password, security', type: 'account' },
    { id: 'privacy', icon: 'lock', title: 'Privacy & Safety', subtitle: 'Private account, comments, messages', type: 'privacy' },
    { id: 'social', icon: 'share_reviews', title: 'Linked Accounts', subtitle: 'Facebook, Instagram, X (Twitter)', type: 'social' },
    { id: 'notifications', icon: 'notifications_active', title: 'Notifications', subtitle: 'Push, email, SMS preferences', type: 'notifications' },
    { id: 'appearance', icon: 'palette', title: 'Appearance', subtitle: 'Wallpapers, themes, colors', type: 'appearance' },
    { id: 'help', icon: 'help', title: 'Help & Support', subtitle: 'FAQ, contact us', type: 'generic' },
    { id: 'logout', icon: 'logout', title: 'Log Out', subtitle: '', type: 'logout', danger: true }
];

export default function SettingsPage({ profileData }) {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null);

    // Real-time user settings
    const [userSettings, setUserSettings] = useState({});

    useEffect(() => {
        if (!profileData?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', profileData.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserSettings(docSnap.data());
            }
        });
        return () => unsub();
    }, [profileData?.uid]);

    const openModal = async (item) => {
        if (item.type === 'logout') {
            const confirmLogout = window.confirm("Are you sure you want to logout?");
            if (confirmLogout) {
                try {
                    await signOut(auth);
                    navigate('/login');
                } catch (e) {
                    console.error("Logout failed", e);
                }
            }
            return;
        }
        setActiveModal(item);
    };

    const closeModal = () => setActiveModal(null);

    // Fallbacks
    const displayName = userSettings.fullName || profileData?.fullName || "User";
    const handle = userSettings.userHandle || profileData?.userHandle || "user";
    const avatarUrl = userSettings.avatarBase64 || profileData?.avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData?.uid || 'default'}`;

    return (
        <div className="settings-page">
            <div className="flex flex-col h-full w-full">
                <header className="settings-header">
                    <button className="icon-btn" onClick={() => navigate(-1)}>
                        <md-icon>arrow_back</md-icon>
                    </button>
                    <h1>Settings</h1>
                    <button className="icon-btn">
                        <md-icon>more_vert</md-icon>
                    </button>
                </header>

                <div className="settings-list">
                    {/* User Profile Card */}
                    <div className="user-card" onClick={() => openModal({ type: 'account', title: 'Account Center' })}>
                        <img src={avatarUrl} alt="Profile" className="user-avatar" />
                        <div className="user-info">
                            <h2>{displayName}</h2>
                            <p>@{handle} • DKUser</p>
                        </div>
                        <md-icon style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>edit</md-icon>
                    </div>

                    <div className="section-title">General</div>

                    {SETTINGS_DATA.map((item) => (
                        <div
                            key={item.id}
                            className={`settings-item ${item.danger ? 'danger' : ''}`}
                            onClick={() => openModal(item)}
                        >
                            <div className="item-icon-box">
                                <md-icon style={{ color: item.danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface-variant)' }}>
                                    {item.icon}
                                </md-icon>
                            </div>
                            <div className="item-text">
                                <h3>{item.title}</h3>
                                {item.subtitle && <p>{item.subtitle}</p>}
                            </div>
                            {!item.danger && (
                                <md-icon style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>chevron_right</md-icon>
                            )}
                        </div>
                    ))}

                    <div className="settings-footer">
                        DKSocial v2.4.0 (Build 9021)<br />
                        &copy; 2026 DKApps Inc.
                    </div>
                </div>
            </div>

            <SettingsModal
                item={activeModal}
                onClose={closeModal}
                data={userSettings}
                uid={profileData?.uid}
            />
        </div>
    );
}

// Modal System
function SettingsModal({ item, onClose, data, uid }) {
    const [isActive, setIsActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Refs for forms
    const nameRef = useRef(null);
    const bioRef = useRef(null);

    // Social Refs
    const fbRef = useRef(null);
    const instaRef = useRef(null);
    const xRef = useRef(null);

    useEffect(() => {
        if (item) setTimeout(() => setIsActive(true), 10);
        else setIsActive(false);
    }, [item]);

    const handleClose = () => {
        setIsActive(false);
        setTimeout(onClose, 300);
    };

    const handleSaveAccount = async () => {
        if (!uid) return;
        setIsSaving(true);
        try {
            const updates = {
                fullName: nameRef.current.value,
                bio: bioRef.current.value
            };
            if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: updates.fullName });
            await updateDoc(doc(db, 'users', uid), updates);
            handleClose();
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSocial = async () => {
        if (!uid) return;
        setIsSaving(true);
        try {
            const socialLinks = {
                facebook: fbRef.current.value,
                instagram: instaRef.current.value,
                twitter: xRef.current.value
            };
            await updateDoc(doc(db, 'users', uid), { socialLinks });
            handleClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save links");
        } finally {
            setIsSaving(false);
        }
    };

    if (!item) return null;

    return (
        <div className={`settings-modal ${isActive ? 'active' : ''}`}>
            <div className="modal-header">
                <button onClick={handleClose} className="icon-btn" style={{ marginRight: '0.5rem' }}>
                    <md-icon>arrow_back</md-icon>
                </button>
                <h2 className="modal-title">{item.title}</h2>
                <div style={{ flex: 1 }}></div>
                {item.type === 'account' && (
                    <button className="modal-save-btn" onClick={handleSaveAccount} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                )}
                {item.type === 'social' && (
                    <button className="modal-save-btn" onClick={handleSaveSocial} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                )}
            </div>

            <div className="modal-content">
                <ModalContent
                    type={item.type}
                    data={data}
                    uid={uid}
                    refs={{ nameRef, bioRef, fbRef, instaRef, xRef }}
                />
            </div>
        </div>
    );
}

// Content Switcher
function ModalContent({ type, data, uid, refs }) {
    const { setThemeColor, setWallpaper, resetTheme, wallpaper } = useTheme();

    // Theme Presets
    const THEME_PRESETS = [
        { name: 'DK Blue', color: '#006492' },
        { name: 'Purple', color: '#6750A4' },
        { name: 'Red', color: '#B3261E' },
        { name: 'Green', color: '#4C662B' },
        { name: 'Pink', color: '#7D5260' },
        { name: 'Teal', color: '#006C4C' },
        { name: 'Orange', color: '#96481C' },
        { name: 'Charcoal', color: '#3F4941' }, // Dark'ish
    ];

    const toggleSetting = async (field) => {
        if (!uid) return;
        const currentVal = data[field];
        // If undefined, assume default depending on logic, but usually false if toggle is 'Active'.
        // If we want specific defaults (like notifications ON), we handle that rendering. 
        // Here we toggle.
        try {
            await updateDoc(doc(db, 'users', uid), {
                [field]: !currentVal
            });
        } catch (err) {
            console.error("Error toggling:", err);
        }
    };

    const handlePasswordReset = async () => {
        if (!auth.currentUser?.email) return;
        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            alert(`Reset link sent to ${auth.currentUser.email}`);
        } catch (e) {
            alert("Error sending reset email: " + e.message);
        }
    };

    switch (type) {
        case 'account':
            return (
                <>
                    <InputGroup label="Display Name" value={data.fullName || ""} refProp={refs.nameRef} />
                    <InputGroup label="Bio" value={data.bio || ""} isArea refProp={refs.bioRef} />
                    <div className="divider-with-label">Security</div>
                    <div onClick={handlePasswordReset}>
                        <SimpleItem title="Change Password" subtitle={auth.currentUser?.email} icon="lock_reset" />
                    </div>
                    <SimpleItem title="User ID" subtitle={uid || "Unknown"} icon="fingerprint" />
                </>
            );

        case 'appearance':
            return (
                <>
                    <div className="info-banner">
                        <md-icon style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>palette</md-icon>
                        <span>Customize your app experience.</span>
                    </div>

                    <Card title="Theme Colors">
                        <div className="color-scroll-container">
                            {THEME_PRESETS.map((t) => (
                                <div key={t.color} className="color-swatch-card" onClick={() => setThemeColor(t.color)}>
                                    <div className="color-circle" style={{ backgroundColor: t.color }}></div>
                                    <span className="color-name">{t.name}</span>
                                </div>
                            ))}
                            <div className="color-swatch-card" style={{ position: 'relative', overflow: 'hidden' }}>
                                <input
                                    type="color"
                                    onChange={(e) => setThemeColor(e.target.value)}
                                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', opacity: 0, cursor: 'pointer' }}
                                />
                                <div className="color-circle" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}></div>
                                <span className="color-name">Custom</span>
                            </div>
                        </div>
                    </Card>

                    <Card title="Wallpaper">
                        <div className="p-2">
                            {wallpaper && (
                                <div className="mb-4 relative rounded-xl overflow-hidden h-32 w-full">
                                    <img src={wallpaper} className="w-full h-full object-cover" />
                                    <button onClick={resetTheme} className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full text-xs">Reset</button>
                                </div>
                            )}
                            <label className="block w-full">
                                <div className="w-full h-12 bg-surface-container-high rounded-full border border-dashed border-outline flex items-center justify-center text-primary cursor-pointer hover:bg-surface-container-highest transition">
                                    <md-icon style={{ marginRight: '8px' }}>upload</md-icon>
                                    <span>Set Wallpaper</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setWallpaper(e.target.files[0])}
                                />
                            </label>
                        </div>
                    </Card>
                </>
            );

        case 'privacy':
            return (
                <>
                    <Card title="Account Privacy">
                        <SwitchItem
                            title="Private Account"
                            subtitle="Only followers see posts"
                            checked={data.isPrivate}
                            onToggle={() => toggleSetting('isPrivate')}
                            icon="lock"
                        />
                        <SwitchItem
                            title="Online Status"
                            subtitle="Show when active"
                            checked={data.showOnline !== false}
                            onToggle={() => toggleSetting('showOnline')}
                            icon="schedule"
                        />
                    </Card>

                    <div className="divider-with-label">Safety</div>
                    <Card title="Interactions">
                        <SwitchItem
                            title="Allow Comments"
                            subtitle="Everyone can comment"
                            checked={data.allowComments !== false}
                            onToggle={() => toggleSetting('allowComments')}
                            icon="chat"
                        />
                        <SwitchItem
                            title="Allow Messages"
                            subtitle="Receive DMs"
                            checked={data.allowMessages !== false}
                            onToggle={() => toggleSetting('allowMessages')}
                            icon="mail"
                        />
                        <SwitchItem
                            title="Show Read Receipts"
                            subtitle="See when messages are read"
                            checked={data.readReceipts}
                            onToggle={() => toggleSetting('readReceipts')}
                            icon="done_all"
                        />
                    </Card>
                </>
            );

        case 'social':
            const social = data.socialLinks || {};
            return (
                <>
                    <div className="info-banner">
                        <md-icon style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>share</md-icon>
                        <span>Links appear on your profile</span>
                    </div>

                    <InputGroup label="Facebook (basta o usuário)" value={social.facebook || ""} refProp={refs.fbRef} />
                    <InputGroup label="Instagram (user sem @)" value={social.instagram || ""} refProp={refs.instaRef} />
                    <InputGroup label="X / Twitter (user sem @)" value={social.twitter || ""} refProp={refs.xRef} />
                </>
            );

        case 'notifications':
            return (
                <>
                    <SwitchItem
                        title="Pause All"
                        checked={data.pauseNotifications}
                        onToggle={() => toggleSetting('pauseNotifications')}
                    />
                    <div className="divider-with-label">Preferences</div>
                    <SwitchItem title="Emails" subtitle="News & updates" checked={data.allowEmails} onToggle={() => toggleSetting('allowEmails')} icon="mail" />
                    <SwitchItem title="Push Notifications" subtitle="Mentions, likes" checked={data.allowPush} onToggle={() => toggleSetting('allowPush')} icon="notifications" />
                </>
            );

        default:
            return (
                <>
                    <div onClick={() => { onClose(); setTimeout(() => window.location.hash = '/faq', 10); navigate('/faq'); }}>
                        <SimpleItem title="FAQ" subtitle="Get answers" icon="quiz" />
                    </div>
                    <div onClick={() => { onClose(); setTimeout(() => window.location.hash = '/terms', 10); navigate('/terms'); }}>
                        <SimpleItem title="Terms of Service" subtitle="Read our rules" icon="description" />
                    </div>
                </>
            );
    }
}

// Reusable UI Components
function InputGroup({ label, value, isArea, refProp }) {
    return (
        <div className="input-group">
            <label className="input-label">{label}</label>
            {isArea ? (
                <textarea ref={refProp} className="styled-textarea" defaultValue={value} rows={3} />
            ) : (
                <input ref={refProp} type="text" className="styled-input" defaultValue={value} />
            )}
        </div>
    );
}

function SwitchItem({ title, subtitle, checked, onToggle, icon }) {
    return (
        <div className="switch-item" onClick={onToggle}>
            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                {icon && <md-icon style={{ marginRight: '1rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{icon}</md-icon>}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '1.125rem', color: 'var(--md-sys-color-on-surface)', fontWeight: 400 }}>{title}</span>
                    {subtitle && <span style={{ fontSize: '0.875rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{subtitle}</span>}
                </div>
            </div>
            <md-switch selected={!!checked} onClick={(e) => e.stopPropagation()} change={onToggle}></md-switch>
        </div>
    );
}

function SimpleItem({ title, subtitle, icon }) {
    return (
        <div className="settings-item">
            {icon && (
                <md-icon style={{ marginRight: '1rem', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '24px' }}>{icon}</md-icon>
            )}
            <div className="item-text">
                <span style={{ display: 'block', fontSize: '1.125rem', color: 'var(--md-sys-color-on-surface)' }}>{title}</span>
                {subtitle && <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{subtitle}</span>}
            </div>
            <md-icon style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>chevron_right</md-icon>
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div className="settings-card">
            <h3 className="card-title">{title}</h3>
            {children}
        </div>
    );
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    argbFromHex,
    themeFromSourceColor,
    applyTheme,
    sourceColorFromImage
} from '@material/material-color-utilities'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
    const [wallpaper, setWallpaper] = useState(localStorage.getItem('app_wallpaper') || null)
    const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('app_primary_color') || '#6750A4')

    // Apply theme from color
    const applyThemeFromColor = useCallback((color) => {
        const theme = themeFromSourceColor(argbFromHex(color))

        // Apply to root
        const root = document.documentElement
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const scheme = isDark ? theme.schemes.dark : theme.schemes.light

        // Set color-scheme
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light')

        for (const [key, value] of Object.entries(scheme.toJSON())) {
            const token = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
            const hex = '#' + value.toString(16).substring(2)
            root.style.setProperty(`--md-sys-color-${token}`, hex)
        }

        // Manually set surface container tokens if missing (using Neutral palette)
        // Dark mode values: Lowest=4, Low=10, Container=12, High=17, Highest=22
        // Light mode values: Lowest=100, Low=96, Container=94, High=92, Highest=90
        const p = theme.palettes.neutral
        const setTone = (token, tone) => {
            const color = p.tone(tone)
            const hex = '#' + (color & 0x00FFFFFF).toString(16).padStart(6, '0')
            root.style.setProperty(`--md-sys-color-${token}`, hex)
        }

        if (isDark) {
            setTone('surface-container-lowest', 4)
            setTone('surface-container-low', 10)
            setTone('surface-container', 12)
            setTone('surface-container-high', 17)
            setTone('surface-container-highest', 22)
            setTone('surface-dim', 6)
            setTone('surface-bright', 24)
        } else {
            setTone('surface-container-lowest', 100)
            setTone('surface-container-low', 96)
            setTone('surface-container', 94)
            setTone('surface-container-high', 92)
            setTone('surface-container-highest', 90)
            setTone('surface-dim', 87)
            setTone('surface-bright', 98)
        }

        // Save to local storage
        localStorage.setItem('app_primary_color', color)
        setPrimaryColor(color)
    }, [])

    // Handle wallpaper change
    const handleSetWallpaper = useCallback(async (file) => {
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            const dataUrl = e.target.result
            setWallpaper(dataUrl)
            localStorage.setItem('app_wallpaper', dataUrl)

            // Create an image element to extract color
            const img = new Image()
            img.src = dataUrl
            img.onload = async () => {
                try {
                    const color = await sourceColorFromImage(img)
                    // Convert ARGB to Hex
                    const hex = '#' + (color & 0x00FFFFFF).toString(16).padStart(6, '0')
                    applyThemeFromColor(hex)
                } catch (error) {
                    console.error('Error extracting color from image:', error)
                }
            }
        }
        reader.readAsDataURL(file)
    }, [applyThemeFromColor])

    const resetTheme = useCallback(() => {
        setWallpaper(null)
        localStorage.removeItem('app_wallpaper')
        applyThemeFromColor('#6750A4') // Default purple
    }, [applyThemeFromColor])

    // Initial load
    useEffect(() => {
        applyThemeFromColor(primaryColor)
    }, [primaryColor, applyThemeFromColor])

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
            applyThemeFromColor(primaryColor)
        }
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [primaryColor, applyThemeFromColor])

    return (
        <ThemeContext.Provider value={{ wallpaper, setWallpaper: handleSetWallpaper, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}

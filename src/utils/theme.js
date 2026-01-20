import {
    argbFromHex,
    themeFromSourceColor,
    applyTheme,
    hexFromArgb
} from "@material/material-color-utilities";

/**
 * Generates a Material 3 theme from a source hex color and applies it to the document body.
 * @param {string} sourceColorHex - The seed color (e.g. "#6750A4")
 * @param {boolean} isDark - Whether to use dark mode
 */
export const applyMaterialTheme = (sourceColorHex, isDark = true) => {
    try {
        const theme = themeFromSourceColor(argbFromHex(sourceColorHex), [
            {
                name: "custom-1",
                value: argbFromHex("#ff0000"),
                blend: true,
            },
        ]);

        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        // Use requested mode or fallback to system if undefined (though we usually preserve preference)
        const darkMode = isDark ?? systemDark;

        // Apply the theme to the root element
        applyTheme(theme, { target: document.body, dark: darkMode });

        // We can also manually set additional variables if needed, 
        // but applyTheme does a great job setting --md-sys-color-* variables.

        // For Yoky's specific variables, we might want to map them to the new sys tokens
        document.documentElement.style.setProperty('--yoky-bg-1', 'var(--md-sys-color-surface)');
        document.documentElement.style.setProperty('--yoky-bg-2', 'var(--md-sys-color-surface-container)');
        document.documentElement.style.setProperty('--yoky-surface-text', 'var(--md-sys-color-on-surface)');
        document.documentElement.style.setProperty('--yoky-accent', 'var(--md-sys-color-primary)');

    } catch (error) {
        console.error("Failed to apply Material theme:", error);
    }
};

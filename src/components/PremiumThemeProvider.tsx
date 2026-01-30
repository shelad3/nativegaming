
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from '../types';

interface PremiumThemeContextType {
    applyTheme: (user: User) => void;
    resetTheme: () => void;
}

const PremiumThemeContext = createContext<PremiumThemeContextType | undefined>(undefined);

const ensureStyleElement = (id: string) => {
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = id;
        document.head.appendChild(el);
    }
    return el;
};

// Helper: Hex to HSL for dynamic CSS variable math
const hexToHsl = (hex: string): { h: number, s: number, l: number } => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const PremiumThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const applyTheme = useCallback((user: User) => {
        const root = document.documentElement;

        // 1. Determine Base Theme Mode (Dark/Light)
        const isLight = user.settings?.theme === 'light';
        root.setAttribute('data-theme', isLight ? 'light' : 'dark');

        // 2. Determine Primary Accent Color
        let primaryHex = '#10b981'; // Default Emerald

        const themeOption = user.settings?.theme || 'dark';
        if (themeOption === 'neon') primaryHex = '#ff00ff';
        if (themeOption === 'high-contrast') primaryHex = '#ffff00';

        // 3. User Tier Overrides (LEGEND custom colors)
        if (user.tier === 'LEGEND' && user.premiumSettings?.customColors?.primary) {
            primaryHex = user.premiumSettings.customColors.primary;
        }

        // 4. Marketplace Skin Overrides (Always takes priority)
        if (user.activeTheme?.colors?.primary) {
            primaryHex = user.activeTheme.colors.primary;
        }

        // 5. Inject Dynamic HSL Variables
        const { h, s, l } = hexToHsl(primaryHex);
        root.style.setProperty('--primary-h', h.toString());
        root.style.setProperty('--primary-s', `${s}%`);
        root.style.setProperty('--primary-l', `${l}%`);

        // Background Overrides (If skin provides them)
        if (user.activeTheme?.colors?.secondary) {
            root.style.setProperty('--bg-secondary', user.activeTheme.colors.secondary);
        } else {
            root.style.removeProperty('--bg-secondary');
        }

        // Animation & Banner Hooks
        if (user.activeTheme?.animation) {
            root.setAttribute('data-theme-animation', user.activeTheme.animation);
        } else {
            root.removeAttribute('data-theme-animation');
        }

        if (user.activeTheme?.profileEffect) {
            root.setAttribute('data-profile-effect', user.activeTheme.profileEffect);
        } else {
            root.removeAttribute('data-profile-effect');
        }

        const themeCssEl = ensureStyleElement('active-theme-css');
        themeCssEl.textContent = user.activeTheme?.effect ? String(user.activeTheme.effect) : '';

        const themeFontEl = ensureStyleElement('active-theme-font');
        const themeFontFamily = user.activeTheme?.fontFamily;
        const themeFontUrl = user.activeTheme?.fontUrl;
        if (themeFontFamily && themeFontUrl) {
            const url = String(themeFontUrl);
            if (url.includes('.css') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
                themeFontEl.textContent = `@import url('${url}');`;
            } else {
                themeFontEl.textContent = `@font-face{font-family:'${themeFontFamily}';src:url('${url}') format('woff2');font-display:swap;}`;
            }
            root.style.setProperty('--app-font', `'${themeFontFamily}', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'`);
        } else {
            themeFontEl.textContent = '';
            root.style.removeProperty('--app-font');
        }

        if (user.activeTheme?.banner) {
            root.style.setProperty('--theme-background', `url(${user.activeTheme.banner})`);
            console.log('Premium Theme Applied:', user.activeTheme.banner);
        } else {
            root.style.removeProperty('--theme-background');
        }

        // Redundant HSL sync for scoped components
        root.style.setProperty('--user-accent-h', h.toString());
        root.style.setProperty('--user-accent-s', `${s}%`);
        root.style.setProperty('--user-accent-l', `${l}%`);

        // Emit sync event for Particle Background
        window.dispatchEvent(new CustomEvent('mesh_theme_sync', {
            detail: { h, s, l, mode: isLight ? 'light' : 'dark' }
        }));
    }, []);

    const resetTheme = useCallback(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', 'dark');
        root.style.setProperty('--primary-h', '161');
        root.style.setProperty('--primary-s', '84%');
        root.style.setProperty('--primary-l', '39%');
        root.style.removeProperty('--app-font');
        root.removeAttribute('data-theme-animation');
        root.removeAttribute('data-profile-effect');
        const cssEl = document.getElementById('active-theme-css') as HTMLStyleElement | null;
        if (cssEl) cssEl.textContent = '';
        const fontEl = document.getElementById('active-theme-font') as HTMLStyleElement | null;
        if (fontEl) fontEl.textContent = '';
    }, []);

    const contextValue = React.useMemo(() => ({
        applyTheme,
        resetTheme
    }), [applyTheme, resetTheme]);

    return (
        <PremiumThemeContext.Provider value={contextValue}>
            {children}
        </PremiumThemeContext.Provider>
    );
};

export const usePremiumTheme = () => {
    const context = useContext(PremiumThemeContext);
    if (!context) throw new Error('usePremiumTheme must be used within PremiumThemeProvider');
    return context;
};

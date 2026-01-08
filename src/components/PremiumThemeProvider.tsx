
import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '../types';

interface PremiumThemeContextType {
    applyTheme: (user: User) => void;
    resetTheme: () => void;
}

const PremiumThemeContext = createContext<PremiumThemeContextType | undefined>(undefined);

export const PremiumThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const applyTheme = (user: User) => {
        // Apply structural theme colors
        const theme = user.settings?.theme || 'dark';

        switch (theme) {
            case 'neon':
                document.documentElement.style.setProperty('--primary', '#ff00ff');
                document.documentElement.style.setProperty('--accent', '#ff00aa');
                document.documentElement.style.setProperty('--secondary', '#050005');
                break;
            case 'high-contrast':
                document.documentElement.style.setProperty('--primary', '#ffff00');
                document.documentElement.style.setProperty('--accent', '#ffffff');
                document.documentElement.style.setProperty('--secondary', '#000000');
                break;
            case 'dark':
            default:
                document.documentElement.style.setProperty('--primary', '#00ff41');
                document.documentElement.style.setProperty('--accent', '#008f11');
                document.documentElement.style.setProperty('--secondary', '#0a0a0c');
        }

        // Override with premium custom colors if they exist and user is LEGEND
        if (user.tier === 'LEGEND' && user.premiumSettings?.customColors) {
            const { primary, secondary, accent } = user.premiumSettings.customColors;
            if (primary) document.documentElement.style.setProperty('--primary', primary);
            if (secondary) document.documentElement.style.setProperty('--secondary', secondary);
            if (accent) document.documentElement.style.setProperty('--accent', accent);
        }

        // Emit theme change for ParticleMesh synchronization
        window.dispatchEvent(new CustomEvent('mesh_sync', {
            detail: {
                theme,
                color: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
            }
        }));
    };

    const resetTheme = () => {
        document.documentElement.style.setProperty('--primary', '#00ff41');
        document.documentElement.style.setProperty('--secondary', '#0a0a0c');
        document.documentElement.style.setProperty('--accent', '#008f11');
    };

    return (
        <PremiumThemeContext.Provider value={{ applyTheme, resetTheme }}>
            {children}
        </PremiumThemeContext.Provider>
    );
};

export const usePremiumTheme = () => {
    const context = useContext(PremiumThemeContext);
    if (!context) throw new Error('usePremiumTheme must be used within PremiumThemeProvider');
    return context;
};

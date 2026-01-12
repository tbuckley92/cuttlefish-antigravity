import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'default' | 'notion';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage for saved theme preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('app-theme');
            if (saved === 'default' || saved === 'notion') {
                return saved;
            }
        }
        return 'default';
    });

    useEffect(() => {
        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', theme);
        // Persist to localStorage
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Theme display names for UI
export const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'notion', label: 'Notion' },
];

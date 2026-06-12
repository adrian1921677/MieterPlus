/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 1:1 synchron mit apps/web/src/app/globals.css
        background: '#ffffff',
        foreground: '#0f172a',
        card: '#ffffff',
        'card-foreground': '#0f172a',
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#f8fafc',
        },
        'primary-dark': '#1d4ed8',
        secondary: {
          DEFAULT: '#f1f5f9',
          foreground: '#0f172a',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        accent: {
          DEFAULT: '#f1f5f9',
          foreground: '#0f172a',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f8fafc',
        },
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#2563eb',
        brand: '#09090b',
      },
      borderRadius: {
        lg: 8,
        md: 6,
        sm: 4,
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Dark mode palette inspired by Bracket Admin (purple sidebar)
        bg: '#0a0815',
        sidebar: '#1a0d33',
        sidebar2: '#231245',
        topbar: '#15111f',
        surface: {
          1: '#15111f',
          2: '#1c1730',
          3: '#251f3c',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
        },
        fg: {
          DEFAULT: '#ffffff',
          muted: '#a09aba',
          dim: '#6f6889',
          faint: '#4a4560',
        },
        // Brand purples
        brand: {
          DEFAULT: '#7c5cff',
          hover: '#9a82ff',
          dim: '#5c44d6',
          soft: '#b39ddb',
        },
        signal: {
          green: '#34d399',
          greenSoft: 'rgba(52,211,153,0.15)',
          red: '#f87171',
          redSoft: 'rgba(248,113,113,0.15)',
          amber: '#fbbf24',
          amberSoft: 'rgba(251,191,36,0.15)',
          blue: '#60a5fa',
          blueSoft: 'rgba(96,165,250,0.15)',
        },
        chart: {
          ikis: '#34d399',
          wts: '#fb923c',
          dx: '#60a5fa',
          alt1: '#a78bfa',
          alt2: '#f472b6',
          alt3: '#facc15',
        },
      },
      letterSpacing: {
        ultra: '0.18em',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 8px rgba(0,0,0,0.35)',
        glow: '0 0 0 1px rgba(124,92,255,0.28), 0 20px 60px -20px rgba(124,92,255,0.30)',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

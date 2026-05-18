/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Surfaces — Linear/Vercel style. Bg is near-black, surfaces step up.
        bg: '#0a0a0c',
        surface: {
          1: '#101013',
          2: '#16161a',
          3: '#1c1c22',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
        },
        fg: {
          DEFAULT: '#ededed',
          muted: '#9a9aa1',
          dim: '#6a6a72',
          faint: '#48484f',
        },
        // Brand accent — Linear-style indigo/violet
        brand: {
          DEFAULT: '#7c5cff',
          hover: '#9379ff',
          dim: '#5641d6',
        },
        signal: {
          red: '#f87171',
          amber: '#fbbf24',
          green: '#34d399',
        },
        // Chart palette — distinct, modern, dark-bg friendly
        chart: {
          ikis: '#34d399', // emerald
          wts: '#fb923c', // orange
          dx: '#60a5fa', // blue
          alt1: '#a78bfa', // violet
          alt2: '#f472b6', // pink
          alt3: '#facc15', // yellow
        },
      },
      letterSpacing: {
        ultra: '0.18em',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(124,92,255,0.30), 0 20px 60px -20px rgba(124,92,255,0.25)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
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
        'fade-in': 'fadeIn 0.4s ease-out both',
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

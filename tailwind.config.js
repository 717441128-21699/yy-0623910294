/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        dark: {
          900: '#0D1117',
          800: '#161B22',
          700: '#21262D',
          600: '#30363D',
          500: '#484F58',
          400: '#6E7681',
          300: '#8B949E',
          200: '#B1BAC4',
          100: '#C9D1D9',
        },
        accent: {
          DEFAULT: '#58A6FF',
          dim: '#1F6FEB',
        },
        breakout: '#F85149',
        cooldown: '#79C0FF',
        ferment: '#D29922',
        success: '#3FB950',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'pulse-breakout': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(248, 81, 73, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(248, 81, 73, 0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        'fade-in-up': {
          from: { transform: 'translateY(12px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
      },
      animation: {
        'pulse-breakout': 'pulse-breakout 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

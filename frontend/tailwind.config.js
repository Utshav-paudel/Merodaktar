/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#04060f',
          900: '#070b18',
          850: '#0b1120',
          800: '#0f1730',
          700: '#15203f',
          600: '#1c2a4f',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(120deg, #8b5cf6 0%, #22d3ee 100%)',
        'gradient-brand-r': 'linear-gradient(120deg, #22d3ee 0%, #8b5cf6 100%)',
        'gradient-radial': 'radial-gradient(closest-side, var(--tw-gradient-stops))',
      },
      boxShadow: {
        glow: '0 0 50px -12px rgba(139, 92, 246, 0.55)',
        'glow-cyan': '0 0 50px -12px rgba(34, 211, 238, 0.5)',
        'glow-sm': '0 0 24px -10px rgba(139, 92, 246, 0.6)',
        glass: '0 12px 40px -16px rgba(0, 0, 0, 0.7)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(24px, -28px) scale(1.06)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'spin-slow': { '100%': { transform: 'rotate(360deg)' } },
        blob: {
          '0%, 100%': { borderRadius: '42% 58% 63% 37% / 41% 44% 56% 59%' },
          '50%': { borderRadius: '58% 42% 37% 63% / 56% 59% 41% 44%' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 16s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s infinite',
        'gradient-x': 'gradient-x 7s ease infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        blob: 'blob 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // canvas / surfaces (clinical off-white with a faint teal tint)
        canvas: {
          50: '#f7fbfb',
          100: '#eef6f6',
          200: '#e3eeef',
        },
        // primary — medical teal
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // accent — health emerald
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(120deg, #0d9488 0%, #10b981 100%)',
        'gradient-brand-soft': 'linear-gradient(120deg, #0d948814 0%, #10b98114 100%)',
        'gradient-radial': 'radial-gradient(closest-side, var(--tw-gradient-stops))',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(13, 148, 136, 0.18)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 12px 32px -16px rgba(15, 23, 42, 0.12)',
        glow: '0 10px 30px -10px rgba(13, 148, 136, 0.45)',
        'glow-sm': '0 6px 18px -8px rgba(13, 148, 136, 0.5)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(22px, -26px) scale(1.05)' },
        },
        'pulse-glow': { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
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
        'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
        shimmer: 'shimmer 2.2s infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        blob: 'blob 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

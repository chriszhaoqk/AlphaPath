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
        'ink': '#0F1419',
        'card': '#1A1F2E',
        'card-hover': '#222838',
        'border-custom': '#2A3040',
        'gold': {
          DEFAULT: '#D4A853',
          light: '#E8C97A',
          dark: '#B8923F',
        },
        'positive': '#10B981',
        'warning': '#F59E0B',
        'urgent': '#EF4444',
        'text-primary': '#E8E8E8',
        'text-secondary': '#8B95A5',
        'text-muted': '#5A6577',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'pulse-gold': 'pulse-gold 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 168, 83, 0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 168, 83, 0)' },
        },
      },
    },
  },
  plugins: [],
};

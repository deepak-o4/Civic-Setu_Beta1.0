/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Finch-inspired design system for CivicSetu
        primary: {
          50: '#eefdf5',
          100: '#d6fbe4',
          200: '#aef4cb',
          300: '#78e8ab',
          400: '#43d488',
          500: '#22b96c', // lime-leaning core accent
          600: '#149a58',
          700: '#117b47',
          800: '#12613b',
          900: '#0f4f32',
        },
        accent: {
          DEFAULT: '#C6F135', // vivid neon lime
          soft: '#E6FF9E',
          dark: '#9FCE1B',
        },
        ink: {
          DEFAULT: '#0B1F1B', // deep teal/near-black for dark sections
          900: '#08211C',
          800: '#0F2C25',
          700: '#16382F',
          600: '#1D453A',
        },
        surface: '#ffffff',
        background: '#F7F5EF', // warm off-white
        muted: '#6B7A74',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(11, 31, 27, 0.18)',
        card: '0 4px 24px -4px rgba(11, 31, 27, 0.10)',
        glow: '0 0 0 1px rgba(198,241,53,0.4), 0 8px 30px -6px rgba(198,241,53,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'spin-slow': 'spin 14s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--tw-rotate,0deg))' },
          '50%': { transform: 'translateY(-14px) rotate(var(--tw-rotate,0deg))' },
        },
      }
    },
  },
  plugins: [],
}

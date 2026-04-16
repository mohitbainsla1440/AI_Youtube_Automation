/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bcfd',
          400: '#8196fa',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#0F0F1A',
          card: '#1A1A2E',
          elevated: '#252540',
          border: '#2D2D50',
        },
        accent: {
          red: '#FF4444',
          green: '#00D084',
          yellow: '#FFB800',
          purple: '#9B59B6',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'sans-serif'],
        medium: ['Inter_500Medium', 'sans-serif'],
        semibold: ['Inter_600SemiBold', 'sans-serif'],
        bold: ['Inter_700Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coal: {
          50: '#f6f7f9', 100: '#eceef2', 200: '#d5d9e1', 300: '#b0b8c5',
          400: '#828d9d', 500: '#636e7d', 600: '#4e5663', 700: '#3f454f',
          800: '#363b43', 850: '#2a2e34', 900: '#23262b', 950: '#181a1d',
        },
        crimson: {
          50: '#fef2f3', 100: '#fde3e5', 200: '#fbccd1', 300: '#f7a8b0',
          400: '#f07583', 500: '#e34b5d', 600: '#cd2c40', 700: '#a81e30',
          800: '#871a29', 900: '#6e1a27', 950: '#3c0a12',
        },
        'accent-teal': '#2dd4bf',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px -8px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

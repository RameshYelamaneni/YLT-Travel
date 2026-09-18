/** @type {import('tailwindcss').Config} */
const navy = {
  50: '#f3f6fb', 100: '#e4ebf5', 200: '#c5d4e8', 300: '#9bb4d4',
  400: '#6b8fb8', 500: '#3d6a9a', 600: '#1e4a7a', 700: '#163a62',
  800: '#0f2c4d', 900: '#0b1f3a', 950: '#071428',
};

const gold = {
  50: '#fff9e8', 100: '#fef0c4', 200: '#fbe08a', 300: '#f5c14a',
  400: '#e8b02a', 500: '#d4a017', 600: '#b8860b', 700: '#8f6809',
  800: '#75540e', 900: '#624412',
};

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
        navy,
        gold,
        crimson: {
          50:  'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
          900: 'rgb(var(--accent-900) / <alpha-value>)',
          950: 'rgb(var(--accent-950) / <alpha-value>)',
        },
        'accent-teal': '#2dd4bf',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px -8px rgba(0,0,0,0.4)',
        search: '0 18px 50px -20px rgba(11, 31, 58, 0.45)',
      },
    },
  },
  plugins: [],
};

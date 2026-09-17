/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          500: "#1f6feb",
          600: "#1858c4",
          700: "#13489c",
        },
        seat: {
          available: "#16a34a",
          locked: "#d97706",
          booked: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

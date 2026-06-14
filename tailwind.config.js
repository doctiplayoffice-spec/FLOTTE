/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support dark mode via 'class' on html element
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#f6f8fa',
          dark: '#090d16',
        },
        surface: {
          light: '#ffffff',
          dark: '#121826',
        },
        input: {
          light: '#f9fafb',
          dark: '#151c2d',
        },
        brand: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

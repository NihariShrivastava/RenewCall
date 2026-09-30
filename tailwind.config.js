/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0e1017',
        'bg-secondary': '#161926',
        'border-dark': '#252840',
        'hover-dark': '#1f2338',
        'accent-blue': '#4f6ef7',
        'accent-purple': '#8b5cf6',
        'brand-green': '#22c55e',
        'brand-yellow': '#eab308',
        'brand-red': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}

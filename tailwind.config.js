/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B2545',
          teal: '#14B8A6',
          light: '#EEF2F6',
          white: '#FFFFFF'
        }
      }
    },
  },
  plugins: [],
}

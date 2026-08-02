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
        whatsapp: {
          light: '#25D366',
          dark: '#075E54',
          teal: '#128C7E',
          blue: '#34B7F1',
          bg: '#ECE5DD',
        }
      }
    },
  },
  plugins: [],
}

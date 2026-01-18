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
          dark: '#0f172a',    // Deep Midnight
          accent: '#10b981',  // Emerald Medical Green
          surface: '#1e293b', // Elevated Slate
          border: '#334155'   // Subtle Glass Border
        }
      }
    },
  },
  plugins: [],
}



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
          primary: '#10b981', // emerald-500
          secondary: '#34d399', // emerald-400
        }
      }
    },
  },
  plugins: [],
}

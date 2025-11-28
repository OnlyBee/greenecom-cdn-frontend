
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "!./src/**", // Exclude src folder
    "!./backend/**", // Exclude backend
    "!./node_modules/**"
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#8b5cf6',
        'brand-secondary': '#7c3aed',
        'base-100': '#111827',
        'base-200': '#1f2937',
        'base-300': '#374151',
        'base-content': '#f3f4f6',
      },
    },
  },
  plugins: [],
}

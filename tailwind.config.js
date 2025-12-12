/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          red: '#FF3B30', // Apple-like red from the mock
          bg: '#F2F2F7', // Light gray background
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f0fc",
          100: "#e8e8f9",
          200: "#d0d0f2",
          300: "#6f6dc9",
          400: "#3d3bb5",
          500: "#1a18a3",
          600: "#05048D",
          700: "#040378",
          800: "#030260",
          900: "#020150",
        },
        surface: {
          DEFAULT: "#ffffff",
          card: "#05048D",
          border: "#c5c4f0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

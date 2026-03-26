/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f2f8f1",
          100: "#e5f1e2",
          200: "#cfe4ca",
          300: "#a5cc9b",
          400: "#79b56a",
          500: "#4f9a40",
          600: "#2f7a22",
          700: "#236017",
          800: "#1b4a12",
          900: "#12340c",
        },
        surface: {
          DEFAULT: "#f2f4f1",
          card: "#1f6515",
          border: "#c9d3c4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

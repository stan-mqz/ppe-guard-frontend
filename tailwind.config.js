/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0b3d63", // navy del sidebar / header del diseño
          dark: "#072b47",
          light: "#1a5280",
        },
        accent: {
          DEFAULT: "#f5a623", // dorado de "UNIVERSIDAD DE ORIENTE" y botones secundarios
        },
      },
    },
  },
  plugins: [],
};

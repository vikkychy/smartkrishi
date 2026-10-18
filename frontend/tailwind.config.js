/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        krishi: {
          50: "#eff7f1",
          100: "#dcecdf",
          500: "#176b45",
          700: "#145638",
          900: "#103d2b",
        },
      },
      boxShadow: {
        glass: "0 18px 50px rgba(20, 62, 43, .08)",
      },
    },
  },
  plugins: [],
};

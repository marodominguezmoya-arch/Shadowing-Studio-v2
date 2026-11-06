/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0B0D",
        surface: "#141416",
        surface2: "#1B1B1E",
        line: "#242427",
        ivory: "#F2F0EA",
        muted: "#93939A",
        brass: "#C9A961",
        brassdim: "#8A7241",
        signal: "#5EEAD4",
      },
      fontFamily: {
        display: ["Baloo 2", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      maxWidth: {
        content: "1180px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        barUnlock: {
          "0%": { transform: "scaleY(1)" },
          "100%": { transform: "scaleY(0)" },
        },
      },
    },
  },
  plugins: [],
};

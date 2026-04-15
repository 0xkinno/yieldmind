/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070A12",
        panel: "#0B1022",
        panel2: "#0E1630",
        border: "rgba(255,255,255,0.10)",
        text: "rgba(255,255,255,0.92)",
        muted: "rgba(255,255,255,0.62)",
        safe: "#22c55e",
        caution: "#f59e0b",
        danger: "#ef4444",
        accent: "#7c3aed"
      },
      boxShadow: {
        glow:
          "0 0 0 1px rgba(124,58,237,0.25), 0 10px 40px rgba(124,58,237,0.15)"
      }
    }
  },
  plugins: []
};


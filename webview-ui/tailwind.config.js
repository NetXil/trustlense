/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        ink: {
          950: "#0a0c10",
          900: "#0d1117",
          850: "#11161e",
          800: "#161c26",
          700: "#1f2733",
          600: "#2a3340",
          500: "#3b4554",
          400: "#5b6577",
          300: "#8b94a6",
          200: "#b7becd",
          100: "#dde1e9",
          50: "#f1f3f7",
        },
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        risk: {
          safe: "#3ddc97",
          review: "#facc15",
          risky: "#fb923c",
          critical: "#f43f5e",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.25), 0 8px 30px rgba(139,92,246,0.25)",
        soft: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "grid-soft":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
        "panel-gradient":
          "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 60%, rgba(0,0,0,0.0) 100%)",
        "hero-glow":
          "radial-gradient(60% 80% at 50% 0%, rgba(139,92,246,0.30) 0%, rgba(139,92,246,0) 70%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

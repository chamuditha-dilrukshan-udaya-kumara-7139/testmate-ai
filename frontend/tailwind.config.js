export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "ui-sans-serif", "sans-serif"]
      },
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16"
        },
        dark: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          850: "#172033",
          900: "#0f172a",
          950: "#020617"
        }
      },
      animation: {
        "fade-in":       "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up":      "slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-left": "slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":      "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse":    "glowPulse 3s ease-in-out infinite",
        "float":         "float 6s ease-in-out infinite",
        "shimmer":       "shimmer 2s linear infinite",
        "spin-slow":     "spin 3s linear infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideInLeft: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(34,197,94,0.15)" },
          "50%":      { boxShadow: "0 0 40px rgba(34,197,94,0.35)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" }
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" }
        }
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":     "radial-gradient(at 40% 20%, hsla(152,100%,50%,0.07) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.07) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.03) 0px, transparent 50%)"
      },
      boxShadow: {
        "glow-sm":  "0 0 12px rgba(34,197,94,0.2)",
        "glow-md":  "0 0 24px rgba(34,197,94,0.25)",
        "glow-lg":  "0 0 48px rgba(34,197,94,0.3)",
        "glass":    "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card":     "0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)",
        "card-hover":"0 8px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)"
      }
    }
  },
  plugins: []
};

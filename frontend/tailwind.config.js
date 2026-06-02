export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.25s ease-out"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(6px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        }
      }
    }
  },
  plugins: []
};

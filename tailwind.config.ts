import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Apple devices render genuine SF Pro; everyone else falls through to
        // Inter, which is self-hosted by next/font.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        // Apple system palette (light mode values)
        ios: {
          blue: "#007AFF",
          green: "#34C759",
          indigo: "#5856D6",
          orange: "#FF9500",
          pink: "#FF2D55",
          purple: "#AF52DE",
          red: "#FF3B30",
          teal: "#30B0C7",
          yellow: "#FFCC00",
          gray: "#8E8E93",
        },
        canvas: "#F2F2F7",
        surface: "#FFFFFF",
        separator: "#E5E5EA",
        label: {
          DEFAULT: "#1C1C1E",
          secondary: "#3C3C4399",
          tertiary: "#3C3C434D",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)",
        "card-hover": "0 2px 4px rgba(0,0,0,0.05), 0 16px 32px -16px rgba(0,0,0,0.18)",
        float: "0 8px 32px -8px rgba(0,0,0,0.18)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "toast-in": "toast-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;

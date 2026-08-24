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
        // Every entry here (except label.*, which bakes in a fixed alpha and
        // can't compose with an opacity modifier) resolves through a CSS
        // variable holding an "R G B" triplet, so utilities like bg-ios-blue/10
        // keep working — see globals.css for the light/dark variable values.
        ios: {
          blue: "rgb(var(--color-ios-blue) / <alpha-value>)",
          green: "rgb(var(--color-ios-green) / <alpha-value>)",
          indigo: "rgb(var(--color-ios-indigo) / <alpha-value>)",
          orange: "rgb(var(--color-ios-orange) / <alpha-value>)",
          pink: "rgb(var(--color-ios-pink) / <alpha-value>)",
          purple: "rgb(var(--color-ios-purple) / <alpha-value>)",
          red: "rgb(var(--color-ios-red) / <alpha-value>)",
          teal: "rgb(var(--color-ios-teal) / <alpha-value>)",
          yellow: "rgb(var(--color-ios-yellow) / <alpha-value>)",
          gray: "rgb(var(--color-ios-gray) / <alpha-value>)",
        },
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        separator: "rgb(var(--color-separator) / <alpha-value>)",
        label: {
          DEFAULT: "var(--color-label)",
          secondary: "var(--color-label-secondary)",
          tertiary: "var(--color-label-tertiary)",
        },
        // Every bg-black/[0.0N] / ring-black/[0.0N] overlay in the app is a
        // "subtle fill relative to the page", not literally black — redefining
        // Tailwind's own `black` swatch to flip with the theme means every one
        // of those call sites reads correctly in dark mode with no per-file
        // edits. (Sheet.tsx's modal backdrop opts out with an explicit #000,
        // since a scrim should stay dark regardless of theme.)
        black: "rgb(var(--color-overlay) / <alpha-value>)",
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

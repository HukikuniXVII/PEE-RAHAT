import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Prompt",
          "Sarabun",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        // Figma: logo, nav items, and CTA buttons use Josefin Sans Bold
        josefin: ['"Josefin Sans"', "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        // ---- design-system.md §1 — canonical Pee Rahat palette ----
        // Primary brand violet (CTA default on light surfaces).
        violet: {
          50: "#C6BFD9",
          100: "#ADA1CE",
          200: "#8E7BC1",
          400: "#664EA7",
          500: "#55418B",
          600: "#483776",
          700: "#3B2D61",
          800: "#2F244C",
        },
        // Butter yellow — hover state on primary CTAs, premium chips.
        accent: {
          50: "#F2EAD5",
          100: "#F0E0B3",
          500: "#F0CB67",
          600: "#ECBE42",
          700: "#E9B21D",
          800: "#B68A12",
        },
        // Neutrals — structure + text.
        neutral: {
          50: "#F5F5F4",
          100: "#EDEAE5",
          200: "#DFD9D8",
          300: "#C5BFC0",
          400: "#9A9499",
          500: "#6B656E",
          700: "#4D4750",
          800: "#2E2A3D",
        },
        // ---- legacy marketing palette (kept for admin + landing migration) ----
        // dusty-grape was the primary; soft-periwinkle is the hover/accent;
        // rosy-taupe is reserved for non-critical microcopy/decorative
        // borders only (AA contrast insufficient for body text).
        "white-smoke": "#F5F5F4",
        "lavender-blush": "#E5DBE6",
        "rosy-taupe": "#BBA0A0",
        "soft-periwinkle": "#7D80DA",
        "dusty-grape": "#55418B",
        "grape-deep": "#3F2F6B",
        "grape-soft": "#EDE8F7",
        "taupe-deep": "#8E7373",
        "taupe-soft": "#F0E5E5",
        ink: "#2A2240",
        "ink-soft": "#5B5176",
        "ink-mute": "#8C84A6",
      },
      borderRadius: {
        md: "8px",
        lg: "14px",
        xl: "24px",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(46,42,61,0.06), 0 4px 12px rgba(46,42,61,0.04)",
        lg: "0 8px 32px rgba(46,42,61,0.08)",
        focus: "0 0 0 3px rgba(240,203,103,0.4)",
      },
    },
  },
};

export default preset;

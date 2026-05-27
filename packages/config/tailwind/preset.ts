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
        // ====================================================================
        // Canonical Pee Rahat palette
        // The landing page and the auth pages are the visual reference for
        // the whole app. All tokens below are first-class — no "legacy"
        // section. Prefer these names in every new component.
        // ====================================================================

        // Primary brand violet. violet-500 is the canonical name for #55418B
        // (formerly also known as `dusty-grape`).
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
        // Extended grape — headline + softest tint that sit outside the
        // linear violet scale. Used on the landing hero and section cards.
        "grape-deep": "#3F2F6B",
        "grape-soft": "#EDE8F7",

        // Secondary blue-violet accent. Chips, sub-labels, soft section bg.
        "soft-periwinkle": "#7D80DA",
        "lavender-blush": "#E5DBE6",

        // Warm decorative neutral. Body-text contrast is insufficient (AA);
        // reserve for decoration, dividers, and microcopy borders.
        "rosy-taupe": "#BBA0A0",
        "taupe-deep": "#8E7373",
        "taupe-soft": "#F0E5E5",

        // Warm "ink" text scale — softer than `neutral`, tuned for warm
        // cream/lavender backgrounds. Use on any surface backed by
        // `.landing-page` or <PageBackground />.
        ink: "#2A2240",
        "ink-soft": "#5B5176",
        "ink-mute": "#8C84A6",

        // Status accents — emerald for verified/online, rose for heart/notification.
        // Values match the V2 community handoff (not Tailwind defaults).
        emerald: {
          600: "#2F9B6E",
          soft: "#D5EEE2",
        },
        rose: {
          600: "#D9436E",
          soft: "#FBC0D2",
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
        // Cool neutral scale — structure + text on white surfaces.
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
        // = neutral-50, exposed under its semantic name for text-on-dark.
        "white-smoke": "#F5F5F4",

        // ====================================================================
        // Shared surface gradient
        // The landing page (.landing-page in globals.css) and the auth
        // backdrop (<PageBackground />) both read these three stops. The
        // values live as CSS custom properties on :root (see globals.css)
        // so a single edit propagates to every backdrop.
        // ====================================================================
        "surface-cream": "var(--pee-surface-cream)",
        "surface-mist": "var(--pee-surface-mist)",
        "surface-dusk": "var(--pee-surface-dusk)",

        // ====================================================================
        // Compatibility alias
        // dusty-grape === violet-500 (#55418B). violet-500 is canonical;
        // dusty-grape stays available so existing class names on landing
        // pages keep resolving while migration happens page-by-page.
        // ====================================================================
        "dusty-grape": "#55418B",
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

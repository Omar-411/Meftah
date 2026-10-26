import type { Config } from "tailwindcss";

// Tokens come straight from the Stitch export (DESIGN.md + tailwind-config in code.html).
type FontSizeEntry = [string, { lineHeight: string; letterSpacing: string; fontWeight: string }];
const typography: Record<string, FontSizeEntry> = {
  "headline-xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
  "headline-xl-mobile": ["26px", { lineHeight: "34px", letterSpacing: "-0.015em", fontWeight: "700" }],
  "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" }],
  "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
  "headline-sm": ["16px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "600" }],
  "body-lg": ["15px", { lineHeight: "22px", letterSpacing: "0em", fontWeight: "400" }],
  "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0em", fontWeight: "400" }],
  "body-sm": ["13px", { lineHeight: "18px", letterSpacing: "0.005em", fontWeight: "400" }],
  "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
  "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.03em", fontWeight: "600" }],
  "currency-display": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "700" }],
};

const interStack = ["Inter", "system-ui", "sans-serif"];
const fontFamily = {
  ...Object.fromEntries(Object.keys(typography).map((key) => [key, interStack])),
  display: ["Sora", ...interStack],
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#faf8ff",
        "surface-dim": "#d2d9f4",
        "surface-bright": "#faf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7ff",
        "surface-container-highest": "#dae2fd",
        "surface-variant": "#dae2fd",
        "surface-tint": "#335f9d",
        "on-surface": "#131b2e",
        "on-surface-variant": "#434750",
        "inverse-surface": "#283044",
        "inverse-on-surface": "#eef0ff",
        outline: "#737781",
        "outline-variant": "#c3c6d2",
        primary: "#00376f",
        "on-primary": "#ffffff",
        "primary-container": "#1f4e8c",
        "on-primary-container": "#9ec1ff",
        "inverse-primary": "#a9c7ff",
        secondary: "#006a61",
        "on-secondary": "#ffffff",
        "secondary-container": "#86f2e4",
        "on-secondary-container": "#006f66",
        tertiary: "#503000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#6f4500",
        "on-tertiary-container": "#ffb043",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "primary-fixed": "#d6e3ff",
        "primary-fixed-dim": "#a9c7ff",
        "on-primary-fixed": "#001b3d",
        "on-primary-fixed-variant": "#144684",
        "secondary-fixed": "#89f5e7",
        "secondary-fixed-dim": "#6bd8cb",
        "on-secondary-fixed": "#00201d",
        "on-secondary-fixed-variant": "#005049",
        "tertiary-fixed": "#ffddb8",
        "tertiary-fixed-dim": "#ffb95f",
        "on-tertiary-fixed": "#2a1700",
        "on-tertiary-fixed-variant": "#653e00",
        background: "#faf8ff",
        "on-background": "#131b2e",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "1rem",
        "gutter-desktop": "1.5rem",
        margin: "1rem",
        "margin-desktop": "2rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1.25rem",
        "space-xl": "2rem",
      },
      fontFamily,
      fontSize: typography,
    },
  },
  plugins: [],
};

export default config;

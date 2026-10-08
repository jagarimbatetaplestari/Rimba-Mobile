import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rimba: {
          grass: "#8DBF7D",
          "grass-dark": "#6B9B5E",
          dirt: "#8B5A2B",
          "dirt-dark": "#633E1A",
          water: "#6FB7C9",
          "water-deep": "#4A93A6",
          stone: "#9BA1A6",
          moss: "#5A7D51",
          gold: "#E5A93C",
          "gold-light": "#FCD34D",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
        "glass-elevated": "0 16px 40px 0 rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;

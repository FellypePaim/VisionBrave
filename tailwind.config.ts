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
        y: "#FBBF24",
        y2: "#FCD34D",
        y3: "#D49B16",
        bg: "#000000",
        sb: "#0A0A0A",
        card: "#111111",
        card2: "#161616",
        b1: "#1F1F1F",
        b2: "#2A2A2A",
        t1: "#FFFFFF",
        t2: "#A3A3A3",
        t3: "#6B6B6B",
        t4: "#3A3A3A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

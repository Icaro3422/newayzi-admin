import type { Config } from "tailwindcss";
import { heroui } from "@heroui/theme";
import { addDynamicIconSelectors } from "@iconify/tailwind";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        heebo: ["var(--font-heebo)", "system-ui", "sans-serif"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        "newayzi-jet": "#2D2D2D",
        "newayzi-white": "#FFFFFF",
        "newayzi-han-purple": "#422DF6",
        "newayzi-purple": "#422DF6",
        "newayzi-majorelle": "#5E2CEC",
        "newayzi-blue": "#5E2CEC",
        "newayzi-dark-orchid": "#9430CF",
        "newayzi-international-blue": "#0E26C0",
        "newayzi-red": "#F0354D",
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        semantic: {
          primary: { DEFAULT: "#5E2CEC", foreground: "#FFFFFF" },
          secondary: { DEFAULT: "#422DF6", foreground: "#FFFFFF" },
          accent: { DEFAULT: "#9430CF", foreground: "#FFFFFF" },
          success: { DEFAULT: "#0E26C0", foreground: "#FFFFFF" },
          danger: { DEFAULT: "#F0354D", foreground: "#FFFFFF" },
          surface: { DEFAULT: "#FFFFFF", subdued: "#F5F5F5", border: "#E5E7EB" },
          text: { DEFAULT: "#2D2D2D", muted: "#6B7280", inverted: "#FFFFFF" },
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#5E2CEC",
              foreground: "#FFFFFF",
            },
            focus: "#5E2CEC",
          },
        },
      },
    }),
    addDynamicIconSelectors(),
  ],
};

export default config;

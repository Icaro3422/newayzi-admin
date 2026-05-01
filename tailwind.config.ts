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
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        heebo: ["var(--font-heebo)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        // Almara (brand book — alineado con newayzi-frontend-v2)
        "almara-midnight": "#0F0F18",
        "almara-deep-navy": "#1A1A24",
        "almara-champagne-gold": "#B89A5E",
        "almara-gold-light": "#D4B97A",
        "almara-ivory": "#F5F0E8",
        "almara-smoke": "#E8E2D6",
        "almara-slate": "#6B6B7A",
        "almara-night": "#1A1A24",
        "almara-cream": "#F5F0E8",
        "almara-soft-beige": "#E8E2D6",
        "almara-shadow": "#D4B97A",
        "almara-warm-gray": "#6B6B7A",
        "almara-jet": "#1A1A24",
        "almara-white": "#F5F0E8",
        "almara-han-purple": "#B89A5E",
        "almara-purple": "#D4B97A",
        "almara-majorelle": "#B89A5E",
        "almara-blue": "#B89A5E",
        "almara-dark-orchid": "#B89A5E",
        "almara-international-blue": "#B89A5E",
        "almara-red": "#6B6B7A",

        // Alias legacy (migración gradual de clases `newayzi-*`)
        "newayzi-jet": "#1A1A24",
        "newayzi-white": "#F5F0E8",
        "newayzi-han-purple": "#B89A5E",
        "newayzi-purple": "#D4B97A",
        "newayzi-majorelle": "#B89A5E",
        "newayzi-blue": "#B89A5E",
        "newayzi-dark-orchid": "#B89A5E",
        "newayzi-international-blue": "#1A1A24",
        "newayzi-red": "#6B6B7A",

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
          primary: { DEFAULT: "#B89A5E", foreground: "#F5F0E8" },
          secondary: { DEFAULT: "#D4B97A", foreground: "#1A1A24" },
          accent: { DEFAULT: "#B89A5E", foreground: "#F5F0E8" },
          success: { DEFAULT: "#1A1A24", foreground: "#F5F0E8" },
          danger: { DEFAULT: "#6B6B7A", foreground: "#F5F0E8" },
          surface: { DEFAULT: "#F5F0E8", subdued: "#F5F0E8", border: "#E8E2D6" },
          text: { DEFAULT: "#1A1A24", muted: "#6B6B7A", inverted: "#F5F0E8" },
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
              DEFAULT: "#B89A5E",
              foreground: "#F5F0E8",
            },
            focus: "#B89A5E",
          },
        },
      },
    }),
    addDynamicIconSelectors(),
  ],
};

export default config;

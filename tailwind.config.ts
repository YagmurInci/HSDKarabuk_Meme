import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        primary: "var(--primary)",
        primaryHover: "var(--primary-hover)",
        accent: "var(--accent)",
        textMain: "var(--text-main)",
        textMuted: "var(--text-muted)",
        success: "var(--success)",
        error: "var(--error)",
      },
      animation: {
        'bounce-slight': 'bounceSlight 0.3s ease-in-out',
        'flash-green': 'flashGreen 0.6s ease-out',
        'flash-red': 'flashRed 0.6s ease-out',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        bounceSlight: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        flashGreen: {
          '0%, 100%': { backgroundColor: 'var(--surface)', borderColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'var(--success)' },
        },
        flashRed: {
          '0%, 100%': { backgroundColor: 'var(--surface)', borderColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'var(--error)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px var(--primary)' },
          '50%': { boxShadow: '0 0 25px var(--primary)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;

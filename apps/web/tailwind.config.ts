import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#05070A',
          secondary: '#080B10',
          tertiary: '#0C1017',
        },
        surface: {
          primary: '#0F141C',
          secondary: '#111822',
          tertiary: '#151C26',
        },
        border: {
          DEFAULT: '#202A36',
          light: '#2A3545',
        },
        text: {
          primary: '#F5F7FA',
          secondary: '#8B98A8',
          muted: '#596575',
        },
        status: {
          healthy: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#38BDF8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

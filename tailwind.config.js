/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Noto Sans Tamil added after Inter so Tamil script glyphs render correctly on Android
        sans: ['"Inter"', '"Noto Sans Tamil"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        civic: {
          50: '#f0f6fe',
          100: '#ddeafe',
          200: '#c3dcfe',
          300: '#9bc6fd',
          400: '#6ca8fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#0f244a',
          950: '#0a172e',
        },
        brand: {
          primary: '#1d4ed8',
          hover: '#1e40af',
          dark: '#0f172a',
          accent: '#0284c7',
          emerald: '#059669',
        },
        tnNavy: {
          50: '#f0f4f9',
          100: '#d9e2f0',
          700: '#1b365d',
          800: '#15294a',
          900: '#0b192c',
          950: '#070f1e',
        },
        tnSaffron: {
          500: '#f59e0b',
          600: '#d97706',
        },
        violetEx: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe',
          500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
        }
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
        card: '0 4px 20px -4px rgba(15, 23, 42, 0.08)',
      }
    },
  },
  plugins: [],
}


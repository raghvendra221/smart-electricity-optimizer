export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      colors: {
        brand: {
          cyan: '#4fd1c5',
          purple: '#7c6aff',
          amber: '#f6ad55',
        },
        dark: {
          900: '#0c0f1a',
          800: '#131726',
          700: '#1a1f35',
          600: '#1e2540',
          500: '#252d47',
          400: '#2e3a5c',
        }
      }
    }
  },
  plugins: []
}

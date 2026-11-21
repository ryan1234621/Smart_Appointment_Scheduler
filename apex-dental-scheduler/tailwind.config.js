/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dental: {
          teal: {
            DEFAULT: '#0D9488', // surgical teal
            dark: '#0F766E',
            light: '#14B8A6', // fresh mint
            wash: '#F0FDFA',
            border: '#99F6E4',
          },
          mint: {
            DEFAULT: '#14B8A6',
            light: '#5EEAD4',
            dark: '#0D9488',
          },
          blue: {
            DEFAULT: '#0284C7', // clinic blue
            dark: '#0369A1',
            light: '#38BDF8',
            soft: '#BAE6FD',
          },
          cyan: {
            hygiene: '#E0F2FE', // soft hygiene cyan
            border: '#7DD3FC',
          },
          slate: {
            sterile: '#F8FAFC', // sterile slate
            muted: '#F1F5F9',
            border: '#E2E8F0',
            text: '#334155',
            heading: '#0F172A',
          },
          branch: {
            preventative: '#0284C7',
            restorative: '#D97706',
            cosmetic: '#8B5CF6',
            orthodontic: '#EC4899',
            surgical: '#0D9488',
          }
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'elevated': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#030712',
          subtle: '#111827',
          elevated: '#1f2937'
        },
        surface: {
          DEFAULT: '#0f172a',
          subtle: '#1e293b',
          muted: '#273449'
        },
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#7dd3fc',
          strong: '#0ea5e9'
        },
        success: '#22c55e',
        warning: '#facc15',
        danger: '#f87171'
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(14, 165, 233, 0.35)'
      }
    }
  },
  plugins: []
};

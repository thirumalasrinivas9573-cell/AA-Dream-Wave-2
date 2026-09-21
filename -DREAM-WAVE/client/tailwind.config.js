/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wave: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'wave-grid':
          'radial-gradient(circle at 20% 20%, rgba(20,184,166,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(6,182,212,0.16), transparent 35%), radial-gradient(circle at 50% 80%, rgba(15,118,110,0.12), transparent 45%)',
      },
    },
  },
  plugins: [],
};
